"""
route_engine.py
Finds the safest route between two Tamil Nadu districts using BFS/shortest-path
on the adjacency graph, scoring each candidate route by district risk levels
with travel details (time, distance, safety advisories, and time of day / travel mode).
"""
import json
import os
import math
from collections import deque
from utils.predictor import predict_district_risk, RISK_SCORES

# ── Load district graph ────────────────────────────────────────────────────────
_DISTRICTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "tn_districts.json")

_graph = {}     # id -> {name, lat, lng, neighbors}
_name_to_id = {}  # lowercase name -> id

def _load_graph():
    global _graph, _name_to_id
    if _graph:
        return
    with open(_DISTRICTS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    for d in data["districts"]:
        _graph[d["id"]] = d
        _name_to_id[d["name"].lower()] = d["id"]
        _name_to_id[d["id"].lower()] = d["id"]

def _resolve_district(name: str) -> str | None:
    """Convert user input to district ID."""
    _load_graph()
    key = name.strip().lower()
    if key in _name_to_id:
        return _name_to_id[key]
    # Fuzzy: partial match
    for k, v in _name_to_id.items():
        if key in k or k in key:
            return v
    return None

def _haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _bfs_paths(source_id: str, dest_id: str, max_paths: int = 3, avoid_high_risk: bool = False) -> list[list[str]]:
    """BFS to find up to max_paths distinct paths from source to destination."""
    _load_graph()
    paths = []
    queue = deque([[source_id]])
    visited_paths = set()

    # Pre-calculate high risk districts to avoid them if parameter set
    high_risk_ids = set()
    if avoid_high_risk:
        for did, data in _graph.items():
            pred = predict_district_risk(data["name"])
            if pred["risk_level"] == "High":
                high_risk_ids.add(did)

    while queue and len(paths) < max_paths:
        path = queue.popleft()
        current = path[-1]

        if current == dest_id:
            key = tuple(path)
            if key not in visited_paths:
                visited_paths.add(key)
                paths.append(path)
            continue

        # Avoid overly long paths
        if len(path) > 12:
            continue

        neighbors = _graph.get(current, {}).get("neighbors", [])
        for nb in neighbors:
            if nb not in path:  # No cycles
                # Skip if we are avoiding high risk districts
                if avoid_high_risk and nb in high_risk_ids and nb != dest_id and nb != source_id:
                    continue
                queue.append(path + [nb])

    # If avoiding high risk resulted in zero paths, fall back to normal BFS
    if not paths and avoid_high_risk:
        return _bfs_paths(source_id, dest_id, max_paths=max_paths, avoid_high_risk=False)

    return paths if paths else [[source_id, dest_id]]  # Direct fallback

def _generate_advisories(district_name: str, risk: str, prediction: dict, time_of_day: str, travel_mode: str, traveler_type: str) -> list[str]:
    """Generates localized safety advisories based on predictive parameters."""
    advisories = []
    breakdown = prediction.get("crime_breakdown", {})
    
    # ── General advisories based on Risk Level ──────────────────────────────────
    if risk == "High":
        advisories.append("High Crime Density: Stay on major highways. Avoid shortcuts.")
    elif risk == "Medium":
        advisories.append("Moderate Risk: Keep doors locked and maintain situational awareness.")
        
    # ── Parametric specific advisories ──────────────────────────────────────────
    if traveler_type == "solo_female":
        stalking = breakdown.get("stalking", 0)
        harassment = breakdown.get("sexual_harassment", 0)
        if stalking > 10 or harassment > 15:
            advisories.append("High instances of stalking/harassment reported. Travel accompanied if possible.")
            
    if time_of_day == "night":
        advisories.append("Night Travel: Ensure your phone is fully charged. Avoid transit after midnight.")
        if risk in ["High", "Medium"]:
            advisories.append("Low Lighting/Patrol: Prefer driving over walking or open transport.")
            
    if travel_mode == "walking":
        if risk == "High":
            advisories.append("Pedestrian Warning: High crime segment. Secure personal belongings and avoid using headphones.")
        elif risk == "Medium":
            advisories.append("Prefer well-lit streets and avoid empty alleyways.")

    # Always ensure at least one positive advisory if the district is safe
    if risk == "Low" and not advisories:
        advisories.append("Safe Zone: Standard precautions apply. Safe for night travel.")
        
    return advisories

def _score_route(district_ids: list[str], time_of_day: str = "day", travel_mode: str = "driving", traveler_type: str = "standard") -> dict:
    """Calculate safety metrics, distance, time, and custom advisories for a route."""
    _load_graph()
    district_details = []
    total_safety = 0
    risk_counts = {"Low": 0, "Medium": 0, "High": 0}
    total_distance = 0.0

    # Calculate distance along path
    for i in range(len(district_ids) - 1):
        d1 = _graph.get(district_ids[i])
        d2 = _graph.get(district_ids[i+1])
        if d1 and d2:
            total_distance += _haversine_distance(d1["lat"], d1["lng"], d2["lat"], d2["lng"])

    # If single district or empty
    if total_distance == 0.0 and len(district_ids) > 1:
        total_distance = len(district_ids) * 45.0 # Fallback estimate in km

    for did in district_ids:
        district_data = _graph.get(did, {})
        district_name = district_data.get("name", did.title())
        prediction = predict_district_risk(district_name)
        
        # Base risk and score
        risk = prediction["risk_level"]
        score = prediction["safety_score"]
        
        # ── Parameter-based safety score adjustments ──────────────────────────
        adjusted_score = score
        
        # Solo female traveler modifier based on stalking, harassment, rape rates
        if traveler_type == "solo_female":
            breakdown = prediction.get("crime_breakdown", {})
            crime_factor = (
                breakdown.get("stalking", 0) * 1.5 + 
                breakdown.get("sexual_harassment", 0) * 1.2 + 
                breakdown.get("rape", 0) * 2.0
            )
            if crime_factor > 30:
                adjusted_score -= min(15, crime_factor / 4.0)

        # Time of day modifier
        if time_of_day == "night":
            if risk == "High":
                adjusted_score -= 10
            elif risk == "Medium":
                adjusted_score -= 5
            else:
                adjusted_score -= 2

        # Travel mode modifier (walking is riskier than driving)
        if travel_mode == "walking":
            if risk == "High":
                adjusted_score -= 12
            elif risk == "Medium":
                adjusted_score -= 6
            else:
                adjusted_score -= 3

        # Clamp score between 0 and 100
        adjusted_score = max(0, min(100, round(adjusted_score, 1)))

        # Update dynamic risk level based on adjusted score
        dynamic_risk = risk
        if adjusted_score >= 75:
            dynamic_risk = "Low"
        elif adjusted_score >= 45:
            dynamic_risk = "Medium"
        else:
            dynamic_risk = "High"

        # Generate advisories
        advisories = _generate_advisories(district_name, dynamic_risk, prediction, time_of_day, travel_mode, traveler_type)

        district_details.append({
            "id": did,
            "name": district_name,
            "lat": district_data.get("lat", 0),
            "lng": district_data.get("lng", 0),
            "risk_level": dynamic_risk,
            "safety_score": adjusted_score,
            "total_incidents": prediction.get("total_incidents", 0),
            "crime_rate": prediction.get("total_crime_rate", 0),
            "crime_breakdown": prediction.get("crime_breakdown", {}),
            "advisories": advisories
        })
        
        total_safety += adjusted_score
        risk_counts[dynamic_risk] = risk_counts.get(dynamic_risk, 0) + 1

    n = len(district_ids)
    avg_safety = round(total_safety / n, 1) if n else 0

    # Penalise routes passing through High-risk zones heavily
    penalty = risk_counts["High"] * 12 + risk_counts["Medium"] * 4
    adjusted_score = max(0, min(100, avg_safety - penalty))

    overall_risk = "Low"
    if risk_counts["High"] > 0:
        overall_risk = "High"
    elif risk_counts["Medium"] > 1:
        overall_risk = "Medium"

    # Calculate travel duration (Driving: avg 60 km/h, Walking: avg 5 km/h)
    speed = 60.0 if travel_mode == "driving" else 5.0
    duration_hours = total_distance / speed
    duration_mins = int(duration_hours * 60)

    # Route safety tips
    route_tips = []
    if risk_counts["High"] > 0:
        route_tips.append("This route contains sections with high crime reports. Ensure doors are locked and windows rolled up.")
    if time_of_day == "night":
        route_tips.append("Night travel active. Stick to main bypass channels and avoid secluded rest stops.")
    if travel_mode == "walking":
        route_tips.append("Walking mode active. Walk in groups if crossing medium or high risk zones.")
    if not route_tips:
        route_tips.append("Recommended safest route. Standard precautions are sufficient.")

    return {
        "districts": district_details,
        "district_count": n,
        "avg_safety_score": avg_safety,
        "adjusted_safety_score": round(adjusted_score, 1),
        "overall_risk": overall_risk,
        "risk_breakdown": risk_counts,
        "distance_km": round(total_distance, 1),
        "duration_mins": duration_mins,
        "route_tips": route_tips
    }

def find_safe_routes(source: str, destination: str, time_of_day: str = "day", travel_mode: str = "driving", traveler_type: str = "standard", avoid_high_risk: bool = False, stopover: str = None) -> dict:
    """
    Main entry point: returns up to 3 ranked routes from source to destination,
    optionally passing through an intermediate stopover district.
    """
    _load_graph()

    src_id = _resolve_district(source)
    dst_id = _resolve_district(destination)

    if not src_id:
        return {"error": f"Source district '{source}' not found in Tamil Nadu district list."}
    if not dst_id:
        return {"error": f"Destination district '{destination}' not found in Tamil Nadu district list."}
    if src_id == dst_id:
        return {"error": "Source and destination cannot be the same district."}

    stop_id = None
    if stopover and stopover.strip():
        stop_id = _resolve_district(stopover)
        if not stop_id:
            return {"error": f"Stopover district '{stopover}' not found in Tamil Nadu district list."}
        if stop_id == src_id or stop_id == dst_id:
            return {"error": "Stopover cannot be equal to source or destination."}

    # ── Path calculation logic ────────────────────────────────────────────────
    if stop_id:
        # Find paths from source to stopover and stopover to destination
        paths_to_stop = _bfs_paths(src_id, stop_id, max_paths=2, avoid_high_risk=avoid_high_risk)
        paths_from_stop = _bfs_paths(stop_id, dst_id, max_paths=2, avoid_high_risk=avoid_high_risk)
        
        # Combine paths
        raw_paths = []
        for p1 in paths_to_stop:
            for p2 in paths_from_stop:
                combined = p1[:-1] + p2
                if len(combined) <= 15: # Avoid excessively long path segments
                    raw_paths.append(combined)
        
        # Unique paths list
        seen_paths = set()
        unique_paths = []
        for p in raw_paths:
            t = tuple(p)
            if t not in seen_paths:
                seen_paths.add(t)
                unique_paths.append(p)
        raw_paths = unique_paths[:3] # Limit to top 3 combined paths
    else:
        raw_paths = _bfs_paths(src_id, dst_id, max_paths=3, avoid_high_risk=avoid_high_risk)

    routes = []
    for i, path in enumerate(raw_paths):
        scored = _score_route(path, time_of_day=time_of_day, travel_mode=travel_mode, traveler_type=traveler_type)
        routes.append({
            "route_id": i + 1,
            "label": f"Route {i + 1}",
            **scored,
        })

    # Sort by adjusted_safety_score descending (safest first)
    routes.sort(key=lambda r: r["adjusted_safety_score"], reverse=True)

    # Label best route
    if routes:
        routes[0]["label"] = "Recommended Safest Route"
        for i, r in enumerate(routes[1:], 2):
            r["label"] = f"Alternative Route {i}"

    src_data = _graph.get(src_id, {})
    dst_data = _graph.get(dst_id, {})
    stop_data = _graph.get(stop_id, {}) if stop_id else None

    return {
        "source": {
            "id": src_id,
            "name": src_data.get("name", source),
            "lat": src_data.get("lat", 0),
            "lng": src_data.get("lng", 0),
        },
        "destination": {
            "id": dst_id,
            "name": dst_data.get("name", destination),
            "lat": dst_data.get("lat", 0),
            "lng": dst_data.get("lng", 0),
        },
        "stopover": {
            "id": stop_id,
            "name": stop_data.get("name", stopover) if stop_data else None,
            "lat": stop_data.get("lat", 0) if stop_data else 0,
            "lng": stop_data.get("lng", 0) if stop_data else 0,
        } if stop_id else None,
        "routes": routes,
        "recommended_route": routes[0] if routes else None,
    }
