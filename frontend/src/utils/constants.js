export const RISK_COLORS = {
  Low: { hex: "#10b981", bg: "var(--risk-low-bg)", text: "var(--risk-low)" },
  Medium: { hex: "#f59e0b", bg: "var(--risk-medium-bg)", text: "var(--risk-medium)" },
  High: { hex: "#ef4444", bg: "var(--risk-high-bg)", text: "var(--risk-high)" },
};

export const RISK_SCORE_COLOR = (score) => {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
};

export const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Coimbatore City",
  "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi",
  "Kancheepuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai",
  "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur",
  "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga",
  "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli",
  "Tirunelveli", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
  "Vellore", "Villupuram", "Virudhunagar", "Puducherry", "Tirupathur",
  "Hosur", "Mettur", "Ooty (Udhagamandalam)", "Kodaikanal",
];

export const CRIME_CATEGORY_LABELS = [
  "Assault (Modesty)",
  "Assault on Women",
  "Sexual Harassment",
  "Disrobing",
  "Voyeurism",
  "Stalking",
  "Rape",
  "Attempt to Rape",
];

export const CHART_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];
