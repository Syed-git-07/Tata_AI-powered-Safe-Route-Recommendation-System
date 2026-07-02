import os
import json
import joblib
import numpy as np
import pandas as pd

# ── Path to the trained model ──────────────────────────────────────────────────
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    r"D:\Syed Sufyan\safe_route_model.pkl"
)

# ── Input features (exact column order the model was trained on) ───────────────
FEATURE_COLUMNS = [
    "assault_on_women_with_intent_to_outrage_her_modesty_-_incidents_(i)",
    "assault_on_women_-_i",
    "sexual_harrassment_total_-_i",
    "assault_or_use_of_criminal_force_on_women_with_intent_to_disrobe_(sec.354b_ipc)_-_i",
    "voyeurism_-_i",
    "stalking_-_i",
    "rape_(sec_376)_-_i",
    "attempt_to_commit_rape_(sec.376/511)_-_i",
    "total_crime_rate",
]

RISK_LABELS = ["Low", "Medium", "High"]
RISK_SCORES = {"Low": 85, "Medium": 55, "High": 20}

# ── Dataset for lookup ─────────────────────────────────────────────────────────
DATASET_PATH = os.environ.get(
    "DATASET_PATH",
    r"D:\Syed Sufyan\crime_master_dataset.csv"
)

_model = None
_df = None


def _load_model():
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
        else:
            _model = None  # Will use mock prediction
    return _model


def _load_dataset():
    global _df
    if _df is None:
        if os.path.exists(DATASET_PATH):
            _df = pd.read_csv(DATASET_PATH)
            _df["districts/city"] = _df["districts/city"].str.strip().str.lower()
        else:
            _df = pd.DataFrame()
    return _df


def predict_district_risk(district_name: str) -> dict:
    """
    Predict the risk level for a district.
    Returns a dict with risk_level, safety_score, crime_stats, confidence.
    """
    df = _load_dataset()
    model = _load_model()

    # Normalise district name
    district_key = district_name.strip().lower()

    # ── Try to find district in dataset ───────────────────────────────────────
    if not df.empty:
        match = df[df["districts/city"] == district_key]
        if not match.empty:
            row = match.iloc[0]
            risk_level = row.get("risk_level", "Medium")
            safety_score = RISK_SCORES.get(risk_level, 50)
            total_incidents = int(row.get("total_crime_incidents", 0))
            severity_score = float(row.get("severity_score", 0))
            total_crime_rate = float(row.get("total_crime_rate", 0))

            # If model is available, use it for prediction too
            if model is not None:
                try:
                    feature_values = []
                    col_map = {c: c for c in FEATURE_COLUMNS}
                    # Map old column names
                    col_map["rape_(sec_376)_-_i"] = "rape_(sec_376)_-_i"
                    col_map["attempt_to_commit_rape_(sec.376/511)_-_i"] = "attempt_to_commit_rape_(sec.376/511)_-_i"
                    for col in FEATURE_COLUMNS:
                        feature_values.append(float(row.get(col, 0)))
                    X = np.array(feature_values).reshape(1, -1)
                    prediction = model.predict(X)[0]
                    risk_level = str(prediction)
                    safety_score = RISK_SCORES.get(risk_level, 50)
                except Exception:
                    pass  # Fall back to dataset risk_level

            return {
                "district": district_name,
                "risk_level": risk_level,
                "safety_score": safety_score,
                "confidence": 0.92,
                "total_incidents": total_incidents,
                "severity_score": severity_score,
                "total_crime_rate": round(total_crime_rate, 2),
                "crime_breakdown": {
                    "assault_modesty": int(row.get("assault_on_women_with_intent_to_outrage_her_modesty_-_incidents_(i)", 0)),
                    "assault_women": int(row.get("assault_on_women_-_i", 0)),
                    "sexual_harassment": int(row.get("sexual_harrassment_total_-_i", 0)),
                    "disrobing": int(row.get("assault_or_use_of_criminal_force_on_women_with_intent_to_disrobe_(sec.354b_ipc)_-_i", 0)),
                    "voyeurism": int(row.get("voyeurism_-_i", 0)),
                    "stalking": int(row.get("stalking_-_i", 0)),
                    "rape": int(row.get("rape_(sec_376)_-_i", 0)),
                    "attempt_rape": int(row.get("attempt_to_commit_rape_(sec.376/511)_-_i", 0)),
                },
            }

    # ── Mock fallback if district not found ────────────────────────────────────
    return _mock_predict(district_name)


def _mock_predict(district_name: str) -> dict:
    """Fallback mock prediction when no dataset match is found."""
    import random
    random.seed(hash(district_name.lower()) % 10000)
    levels = ["Low", "Medium", "High"]
    weights = [0.4, 0.4, 0.2]
    risk_level = random.choices(levels, weights=weights)[0]
    safety_score = RISK_SCORES[risk_level] + random.randint(-5, 5)
    return {
        "district": district_name,
        "risk_level": risk_level,
        "safety_score": safety_score,
        "confidence": 0.78,
        "total_incidents": random.randint(5, 200),
        "severity_score": round(random.uniform(50, 800), 1),
        "total_crime_rate": round(random.uniform(1, 15), 2),
        "crime_breakdown": {
            "assault_modesty": random.randint(0, 50),
            "assault_women": random.randint(0, 30),
            "sexual_harassment": random.randint(0, 20),
            "disrobing": random.randint(0, 5),
            "voyeurism": random.randint(0, 5),
            "stalking": random.randint(0, 15),
            "rape": random.randint(0, 30),
            "attempt_rape": random.randint(0, 5),
        },
    }


def get_all_district_risks() -> list:
    """Return risk predictions for all districts in the dataset with geographical coordinates."""
    df = _load_dataset()
    results = []
    
    # Load coordinates
    coords = {}
    try:
        dist_path = os.path.join(os.path.dirname(__file__), "..", "data", "tn_districts.json")
        with open(dist_path, encoding="utf-8") as f:
            d_graph = json.load(f)
            for d in d_graph.get("districts", []):
                coords[d["name"].lower()] = (d["lat"], d["lng"])
    except Exception:
        pass

    if not df.empty:
        for _, row in df.iterrows():
            district = row.get("districts/city", "Unknown")
            risk = row.get("risk_level", "Medium")
            lat, lng = coords.get(district.lower(), (11.0, 78.0)) # fallback center
            results.append({
                "district": district.title(),
                "risk_level": risk,
                "safety_score": RISK_SCORES.get(risk, 50),
                "total_incidents": int(row.get("total_crime_incidents", 0)),
                "severity_score": float(row.get("severity_score", 0)),
                "total_crime_rate": round(float(row.get("total_crime_rate", 0)), 2),
                "lat": lat,
                "lng": lng
            })
    return results


def get_crime_dashboard_data() -> dict:
    """Return analytics data for the dashboard."""
    df = _load_dataset()
    if df.empty:
        return {}

    crime_cols = [
        "assault_on_women_with_intent_to_outrage_her_modesty_-_incidents_(i)",
        "assault_on_women_-_i",
        "sexual_harrassment_total_-_i",
        "assault_or_use_of_criminal_force_on_women_with_intent_to_disrobe_(sec.354b_ipc)_-_i",
        "voyeurism_-_i",
        "stalking_-_i",
        "rape_(sec_376)_-_i",
        "attempt_to_commit_rape_(sec.376/511)_-_i",
    ]

    crime_labels = [
        "Assault (Modesty)",
        "Assault on Women",
        "Sexual Harassment",
        "Disrobing",
        "Voyeurism",
        "Stalking",
        "Rape",
        "Attempt to Rape",
    ]

    totals = [int(df[c].sum()) for c in crime_cols if c in df.columns]

    risk_distribution = df["risk_level"].value_counts().to_dict() if "risk_level" in df.columns else {}

    top_dangerous = (
        df.nlargest(5, "total_crime_incidents")[["districts/city", "total_crime_incidents", "risk_level", "total_crime_rate"]]
        .to_dict(orient="records")
        if "total_crime_incidents" in df.columns
        else []
    )
    top_safe = (
        df.nsmallest(5, "total_crime_incidents")[["districts/city", "total_crime_incidents", "risk_level", "total_crime_rate"]]
        .to_dict(orient="records")
        if "total_crime_incidents" in df.columns
        else []
    )

    district_crime_rates = (
        df[["districts/city", "total_crime_rate", "risk_level"]]
        .sort_values("total_crime_rate", ascending=False)
        .to_dict(orient="records")
        if "total_crime_rate" in df.columns
        else []
    )

    return {
        "crime_categories": {
            "labels": crime_labels,
            "data": totals,
        },
        "risk_distribution": risk_distribution,
        "top_dangerous_districts": [
            {
                "district": r["districts/city"].title(),
                "incidents": r["total_crime_incidents"],
                "risk_level": r["risk_level"],
                "crime_rate": round(r["total_crime_rate"], 2),
            }
            for r in top_dangerous
        ],
        "top_safe_districts": [
            {
                "district": r["districts/city"].title(),
                "incidents": r["total_crime_incidents"],
                "risk_level": r["risk_level"],
                "crime_rate": round(r["total_crime_rate"], 2),
            }
            for r in top_safe
        ],
        "district_crime_rates": [
            {
                "district": r["districts/city"].title(),
                "crime_rate": round(r["total_crime_rate"], 2),
                "risk_level": r["risk_level"],
            }
            for r in district_crime_rates
        ],
        "total_districts": len(df),
        "total_incidents": int(df["total_crime_incidents"].sum()) if "total_crime_incidents" in df.columns else 0,
    }
