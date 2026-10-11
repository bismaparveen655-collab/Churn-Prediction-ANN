
"use strict";

// Same-origin API URL for Render deployment
const API_URL = "/predict";

// Get HTML elements
const predictionForm = document.getElementById("predictionForm");
const predictButton = document.getElementById("predictButton");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const resultDescription = document.getElementById("resultDescription");
const probabilityValue = document.getElementById("probabilityValue");
const probabilityBar = document.getElementById("probabilityBar");
const resultFootnote = document.getElementById("resultFootnote");
const resultIcon = document.getElementById("resultIcon");
const statusMessage = document.getElementById("statusMessage");

// Stop early if the HTML element IDs do not match
if (!predictionForm || !predictButton || !resultCard || !statusMessage) {
    console.error(
        "Required HTML elements are missing. Check index.html element IDs."
    );
} else {
    // Show a status or error message
    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.classList.toggle("error", isError);
    }

    // Display the prediction returned by FastAPI
    function displayPrediction(data) {
        const isChurn = Number(data.prediction) === 1;
        const probability = Number(data.churn_probability);
        const threshold = Number(data.threshold);

        // Validate the response
        if (
            !Number.isFinite(probability) ||
            !Number.isFinite(threshold)
        ) {
            throw new Error("Invalid prediction response from the backend.");
        }

        // Update result heading and description
        resultTitle.textContent = isChurn
            ? "High Churn Risk"
            : "Lower Churn Risk";

        resultDescription.textContent = isChurn
            ? "The ANN predicts that this customer is at risk of churn."
            : "The ANN predicts that this customer is less likely to churn.";

        // Show churn probability as a percentage
        const safeProbability = Math.min(100, Math.max(0, probability));

        probabilityValue.textContent = `${safeProbability.toFixed(2)}%`;
        probabilityBar.style.width = `${safeProbability}%`;

        // Apply the matching result style
        resultCard.classList.toggle("churn-result", isChurn);
        resultCard.classList.toggle("safe-result", !isChurn);

        if (resultIcon) {
            resultIcon.textContent = isChurn ? "!" : "✓";
        }

        // The backend threshold is a fraction, e.g. 0.45 = 45%
        resultFootnote.textContent =
            `Decision threshold: ${(threshold * 100).toFixed(1)}%. ` +
            "This is a model estimate, not a guarantee of customer behavior.";

        // Reveal the result
        resultCard.classList.remove("hidden");
        resultCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // Submit customer data to the ANN API
    predictionForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        resultCard.classList.add("hidden");
        resultCard.classList.remove("churn-result", "safe-result");

        predictButton.disabled = true;

        const buttonText = predictButton.querySelector("span");
        if (buttonText) {
            buttonText.textContent = "Analyzing...";
        }

        showStatus("Connecting to your ANN model...");

        try {
            // Read all submitted form fields
            const formData = new FormData(predictionForm);
            const customer = Object.fromEntries(formData.entries());

            // Convert numeric fields to numbers
            const numericFields = [
                "SeniorCitizen",
                "tenure",
                "MonthlyCharges",
                "TotalCharges"
            ];

            for (const field of numericFields) {
                if (
                    customer[field] === undefined ||
                    customer[field].trim() === ""
                ) {
                    throw new Error(`Please enter a value for ${field}.`);
                }

                customer[field] = Number(customer[field]);

                if (!Number.isFinite(customer[field])) {
                    throw new Error(`Please enter a valid number for ${field}.`);
                }
            }

            // Send the request to FastAPI
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(customer)
            });

            // Read the response safely
            const data = await response.json();

            if (!response.ok) {
                const detail = data.detail;

                throw new Error(
                    typeof detail === "string"
                        ? detail
                        : "Prediction failed. Check the input values."
                );
            }

            // Display the model result
            displayPrediction(data);
            showStatus("Prediction completed successfully.");

        } catch (error) {
            console.error("Prediction error:", error);

            showStatus(
                error.message === "Failed to fetch"
                    ? "Cannot connect to the backend. Check the Render deployment and logs."
                    : error.message,
                true
            );

        } finally {
            predictButton.disabled = false;

            if (buttonText) {
                buttonText.textContent = "Analyze Customer";
            }
        }
    });

    // Reset the form and hide the previous result
    predictionForm.addEventListener("reset", function () {
        resultCard.classList.add("hidden");
        resultCard.classList.remove("churn-result", "safe-result");

        showStatus("");
        probabilityValue.textContent = "0%";
        probabilityBar.style.width = "0%";

        if (resultIcon) {
            resultIcon.textContent = "";
        }
    });
}
