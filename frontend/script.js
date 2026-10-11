"use strict";

// Backend API ka address.
// FastAPI ko port 8000 par run hona chahiye.
const API_URL = "/predict";

// HTML ke important elements ko select karein
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

// Status message ko show ya clear karne ke liye helper function
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
}

// Form submit hone par prediction request send karein
predictionForm.addEventListener("submit", async function (event) {
    // Default page reload ko rokein
    event.preventDefault();

    // Purana result hide karein
    resultCard.classList.add("hidden");
    resultCard.classList.remove("churn-result", "safe-result");

    // User ko loading state show karein
    predictButton.disabled = true;
    predictButton.querySelector("span").textContent = "Analyzing...";
    showStatus("Connecting to your ANN model...");

    try {
        // Form ki tamam values read karein
        const formData = new FormData(predictionForm);
        const customer = Object.fromEntries(formData.entries());

        // Numeric features ko JavaScript numbers mein convert karein
        // Warna JSON mein ye values strings ban kar ja sakti hain
        customer.SeniorCitizen = Number(customer.SeniorCitizen);
        customer.tenure = Number(customer.tenure);
        customer.MonthlyCharges = Number(customer.MonthlyCharges);
        customer.TotalCharges = Number(customer.TotalCharges);

        // Customer details backend ko bhejein
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customer)
        });

        // Backend ka JSON response read karein
        const data = await response.json();

        // Backend error return kare to usay display karein
        if (!response.ok) {
            throw new Error(
                data.detail || "Prediction request failed."
            );
        }

        // API se aane wali actual prediction display karein
        displayPrediction(data);

        showStatus("Prediction completed successfully.");

    } catch (error) {
        // Network, backend ya validation error user ko batayein
        console.error("Prediction error:", error);

        showStatus(
            error.message.includes("Failed to fetch")
                ? "Backend connect nahi ho raha. Check karein ke FastAPI running hai."
                : error.message,
            true
        );

    } finally {
        // Request complete hone par button dobara enable karein
        predictButton.disabled = false;
        predictButton.querySelector("span").textContent = "Analyze Customer";
    }
});


// Backend ke result ko dashboard par display karne ka function
function displayPrediction(data) {
    const isChurn = data.prediction === 1;
    const probability = Number(data.churn_probability);

    // API response ke basis par heading aur description set karein
    resultTitle.textContent = isChurn
        ? "High Churn Risk"
        : "Lower Churn Risk";

    resultDescription.textContent = isChurn
        ? "The ANN predicts that this customer is at risk of churn."
        : "The ANN predicts that this customer is less likely to churn.";

    // Probability ko percentage aur progress bar mein show karein
    probabilityValue.textContent = `${probability.toFixed(2)}%`;
    probabilityBar.style.width = `${Math.min(100, Math.max(0, probability))}%`;

    // Prediction ke mutabiq visual style change karein
    resultCard.classList.toggle("churn-result", isChurn);
    resultCard.classList.toggle("safe-result", !isChurn);

    resultIcon.textContent = isChurn ? "!" : "✓";

    // Actual model threshold show karein
    resultFootnote.textContent =
        `Decision threshold: ${(Number(data.threshold) * 100).toFixed(1)}%. ` +
        "This is a model estimate, not a guarantee of customer behavior.";

    // Result card visible karein aur us tak scroll karein
    resultCard.classList.remove("hidden");
    resultCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// Reset button par purana result aur messages clear karein
predictionForm.addEventListener("reset", function () {
    resultCard.classList.add("hidden");
    resultCard.classList.remove("churn-result", "safe-result");

    showStatus("");
});
form.addEventListener("reset", () => {
    resultCard.classList.add("hidden");
    resultCard.classList.remove("churn", "safe");
    statusMessage.textContent = "";

    setTimeout(() => {
        form.querySelectorAll("select").forEach(select => {
            select.selectedIndex = 0;
        });
    }, 0);
});