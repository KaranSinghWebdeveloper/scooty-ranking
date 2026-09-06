/**
 * Kainchi Dham Scooty Rental
 * Dynamic Data Fetching, Form Validation & Firebase Mail Integration
 */

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let db = null;
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    } catch (err) {
        console.warn("Firebase not configured. Forms will log locally.", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Fetch Main Site Data
        const dataResponse = await fetch("data.json");
        if (dataResponse.ok) {
            const siteData = await dataResponse.json();
            populateContactElements(siteData.business);
            populateScooterGrid(siteData.scooters);
            populateScooterDropdown(siteData.scooters);
            setupDatePickers();
            bindBookingForm(siteData.business);
        }

        // 2. Fetch Blog Data
        const blogResponse = await fetch("blog.json");
        if (blogResponse.ok) {
            const blogData = await blogResponse.json();
            populateBlogs(blogData.blogs);
        }
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

function populateContactElements(business) {
    document.querySelectorAll(".dynamic-phone-link").forEach(el => el.href = `tel:${business.phone}`);
    document.querySelectorAll(".dynamic-phone-text").forEach(el => el.textContent = business.displayPhone);
    document.querySelectorAll(".dynamic-address").forEach(el => el.textContent = business.address);
    document.querySelectorAll(".dynamic-hours").forEach(el => el.textContent = business.hours);

    const waBtn = document.getElementById("floatingWhatsApp");
    if (waBtn) {
        const text = encodeURIComponent("Namaste! I want to inquire about renting a scooty at Kainchi Dham.");
        waBtn.href = `https://wa.me/${business.whatsapp}?text=${text}`;
    }
}

function populateScooterGrid(scooters) {
    const container = document.getElementById("scooterGridContainer");
    if (!container) return;

    container.innerHTML = "";
    scooters.forEach(scooter => {
        const featureList = scooter.features.map(f => `<li><i class="fa-solid fa-check" style="color:#10b981; margin-right:5px;"></i> ${f}</li>`).join("");
        const card = document.createElement("article");
        card.className = "vehicle-card";
        card.innerHTML = `
      <img src="${scooter.image}" alt="${scooter.name}" loading="lazy" />
      <div class="vehicle-info">
        <h3>${scooter.name}</h3>
        <div class="vehicle-meta">
          <span><i class="fa-solid fa-gauge-high"></i> ${scooter.engine}</span>
          <span><i class="fa-solid fa-gas-pump"></i> ${scooter.mileage}</span>
        </div>
        <div class="price-tag">₹${scooter.pricePerDay} <span style="font-size:0.85rem; font-weight:normal; color:#64748b;">/ Day</span></div>
        <ul class="specs">${featureList}</ul>
        <a href="index.html#bookingSection" class="btn btn-primary" style="justify-content: center; width: 100%;">Reserve ${scooter.name}</a>
      </div>
    `;
        container.appendChild(card);
    });
}

function populateScooterDropdown(scooters) {
    const dropdown = document.getElementById("scooterSelect");
    if (!dropdown) return;
    dropdown.innerHTML = `<option value="" disabled selected>-- Select a Scooter --</option>`;
    scooters.forEach(scooter => {
        const opt = document.createElement("option");
        opt.value = `${scooter.name} (₹${scooter.pricePerDay}/day)`;
        opt.textContent = `${scooter.name} — ₹${scooter.pricePerDay} per day`;
        dropdown.appendChild(opt);
    });
}

function setupDatePickers() {
    const pickupInput = document.getElementById("pickupDate");
    const returnInput = document.getElementById("returnDate");
    if (!pickupInput || !returnInput) return;

    const today = new Date().toISOString().split("T")[0];
    pickupInput.min = today;
    returnInput.min = today;

    pickupInput.addEventListener("change", () => {
        returnInput.min = pickupInput.value;
        if (returnInput.value && returnInput.value < pickupInput.value) {
            returnInput.value = pickupInput.value;
        }
    });
}

function bindBookingForm(business) {
    const form = document.getElementById("scootyBookingForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("formSubmitBtn");
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing Booking...";

        const payload = {
            customerName: document.getElementById("custName").value.trim(),
            customerPhone: document.getElementById("custPhone").value.trim(),
            scooterModel: document.getElementById("scooterSelect").value,
            pickupDate: document.getElementById("pickupDate").value,
            returnDate: document.getElementById("returnDate").value
        };

        try {
            if (db) {
                await db.collection("mail").add({
                    to: business.email,
                    message: {
                        subject: `New Booking: ${payload.customerName}`,
                        html: `<h2>New Booking</h2><p>Name: ${payload.customerName}</p><p>Phone: ${payload.customerPhone}</p><p>Scooter: ${payload.scooterModel}</p><p>From: ${payload.pickupDate} To: ${payload.returnDate}</p>`
                    }
                });
            }
            alert("Reservation submitted successfully! We will call you shortly.");
            form.reset();
        } catch (err) {
            console.error(err);
            const fallbackMsg = encodeURIComponent(`*New Booking*\nName: ${payload.customerName}\nPhone: ${payload.customerPhone}\nModel: ${payload.scooterModel}\nDates: ${payload.pickupDate} to ${payload.returnDate}`);
            window.open(`https://wa.me/${business.whatsapp}?text=${fallbackMsg}`, "_blank");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Booking Request";
        }
    });
}

// --- NEW BLOG LOGIC ---
function populateBlogs(blogs) {
    // Check if we are on the dedicated blog page
    const mainBlogContainer = document.getElementById("mainBlogContainer");

    // Check if we are on the homepage (recent blogs section)
    const homeBlogContainer = document.getElementById("homeBlogContainer");

    const generateBlogHTML = (blog) => `
    <article class="blog-card">
      <img src="${blog.image}" alt="${blog.title}" loading="lazy" />
      <div class="blog-content">
        <div class="blog-date">${blog.date}</div>
        <h3>${blog.title}</h3>
        <p>${blog.excerpt}</p>
        <a href="${blog.link}" class="read-more">Read Article <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </article>
  `;

    // Populate Blog Page (All blogs)
    if (mainBlogContainer) {
        mainBlogContainer.innerHTML = blogs.map(generateBlogHTML).join('');
    }

    // Populate Homepage (Only first 3 blogs)
    if (homeBlogContainer) {
        const recentBlogs = blogs.slice(0, 3); // Get top 3
        homeBlogContainer.innerHTML = recentBlogs.map(generateBlogHTML).join('');
    }
}