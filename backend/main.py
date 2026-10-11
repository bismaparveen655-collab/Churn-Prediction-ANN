
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model


# --------------------------------------------------
# Project paths
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "saved_models"
FRONTEND_DIR = BASE_DIR / "frontend"

MODEL_PATH = MODEL_DIR / "churn_ann.keras"
PREPROCESSOR_PATH = MODEL_DIR / "churn_preprocessor.joblib"
CONFIG_PATH = MODEL_DIR / "churn_config.json"
HTML_PATH = FRONTEND_DIR / "index.html"


# --------------------------------------------------
# Check required files
# --------------------------------------------------
for path in [
    MODEL_PATH,
    PREPROCESSOR_PATH,
    CONFIG_PATH,
    HTML_PATH,
]:
    if not path.exists():
        raise FileNotFoundError(
            f"Required project file not found: {path}"
        )


# --------------------------------------------------
# Load trained ANN and preprocessing artifacts
# --------------------------------------------------
model = load_model(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)

with open(CONFIG_PATH, "r", encoding="utf-8") as file:
    config = json.load(file)

THRESHOLD = float(config["threshold"])


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------
app = FastAPI(
    title="ANN Customer Churn Prediction API",
    description="Predict customer churn using a trained ANN.",
    version="1.0.0",
)


# CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Expected model input features
# Keep these names aligned with training
# --------------------------------------------------
FEATURES = [
    "gender",
    "SeniorCitizen",
    "Partner",
    "Dependents",
    "tenure",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
    "MonthlyCharges",
    "TotalCharges",
]


# --------------------------------------------------
# Validate incoming customer data
# --------------------------------------------------
class CustomerData(BaseModel):
    gender: str
    SeniorCitizen: int = Field(ge=0, le=1)
    Partner: str
    Dependents: str
    tenure: int = Field(ge=0, le=1000)
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float = Field(ge=0)
    TotalCharges: float = Field(ge=0)


# --------------------------------------------------
# Health check
# GET /health
# --------------------------------------------------
@app.get("/health")
def health():
    return {
        "message": "ANN Customer Churn API is running",
        "threshold": THRESHOLD,
    }


# --------------------------------------------------
# Predict customer churn
# POST /predict
# --------------------------------------------------
@app.post("/predict")
def predict_churn(customer: CustomerData):
    try:
        customer_data = customer.model_dump()

        input_df = pd.DataFrame(
            [customer_data],
            columns=FEATURES,
        )

        # Apply the same fitted preprocessing used in training
        processed_data = preprocessor.transform(input_df)

        # Get churn probability from the ANN
        probability = float(
            model.predict(
                processed_data,
                verbose=0,
            ).ravel()[0]
        )

        # Convert probability to percentage for the frontend
        probability_percent = round(probability * 100, 2)

        # Apply the saved decision threshold
        prediction = int(probability >= THRESHOLD)

        return {
            "prediction": prediction,
            "result": "Churn" if prediction == 1 else "No Churn",
            "churn_probability": probability_percent,
            "threshold": THRESHOLD,
        }

    except Exception as error:
        print("Prediction error:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Check backend logs.",
        )


# --------------------------------------------------
# Serve the frontend
# Keep these routes AFTER the API routes
# --------------------------------------------------
@app.get("/", include_in_schema=False)
async def home():
    return FileResponse(HTML_PATH)


# Serve CSS, JavaScript, and other static assets
app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True,
    ),
    name="frontend",
)
