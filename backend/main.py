from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model


# Project folder ka path find karein
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "saved_models"

# Saved ANN, preprocessor aur threshold load karein
model = load_model(MODEL_DIR / "churn_ann.keras")

preprocessor = joblib.load(
    MODEL_DIR / "churn_preprocessor.joblib"
)

with open(MODEL_DIR / "churn_config.json", "r") as file:
    config = json.load(file)

THRESHOLD = float(config["threshold"])


# FastAPI application create karein
app = FastAPI(
    title="ANN Customer Churn Prediction API",
    description="Predict customer churn using a trained ANN.",
    version="1.0.0"
)

# Local frontend ko backend se connect karne ki permission dein
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# Ye 19 input features training dataset ke columns se match karne chahiye
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
    "TotalCharges"
]


# Request body ki validation ke liye data model
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


# API check karne ke liye simple route
@app.get("/")
def home():
    return {
        "message": "ANN Customer Churn API is running",
        "threshold": THRESHOLD
    }


# Customer details receive karke churn prediction karein
@app.post("/predict")
def predict_churn(customer: CustomerData):

    try:
        # Input ko dictionary mein convert karein
        customer_data = customer.model_dump()

        # DataFrame ke columns training features ke same order mein rakhein
        input_df = pd.DataFrame(
            [customer_data],
            columns=FEATURES
        )

        # Wohi fitted preprocessing use karein jo training mein save ki thi
        processed_data = preprocessor.transform(input_df)

        # ANN se churn probability calculate karein
        probability = float(
            model.predict(processed_data, verbose=0).ravel()[0]
        )

        # Saved threshold se final class decide karein
        prediction = int(probability >= THRESHOLD)

        # Frontend ko prediction aur probability return karein
        return {
            "prediction": prediction,
            "result": "Churn" if prediction == 1 else "No Churn",
            "churn_probability": round(probability * 100, 2),
            "threshold": THRESHOLD
        }

    except Exception as error:
        # Server logs mein error details check kar sakte hain
        print("Prediction error:", error)
        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Check backend logs."
        )
        # Project directories
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Serve the frontend
@app.get("/", include_in_schema=False)
async def home():
    return FileResponse(FRONTEND_DIR / "index.html")

# Serve CSS and JavaScript
app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="frontend"
)