require("dotenv").config();

// Works in Node 16 and 18+
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const notifier = require("node-notifier");

// 👇 Track seen users per day
let seenUIDs = new Set();
let currentDate = new Date().toDateString();

const API_URL =
  "https://jamesriver.fellowshiponego.com/js/get_child_checkin_status/all";


const f1Key = process.env.f1Key;

async function checkPeople() {
  try {
    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-SessionID": f1Key,
      },
    });

    if (!res.ok) {
      console.error("API returned error:", res.status, res.statusText);
      return;
    }

    const json = await res.json();

    // Reset at midnight
    const today = new Date().toDateString();
    if (today !== currentDate) {
      seenUIDs.clear();
      currentDate = today;
    }

    // 👇 Go directly into the alert group
    const alerts =
      json["◘ALERT: CHECK PARENT INTO THIS GROUP (NO FOB ALLOWED)"];

    if (!Array.isArray(alerts)) {
      console.error("Alert group not found or not an array");
      return;
    }

    for (const person of alerts) {
      if (!seenUIDs.has(person.uid)) {
        seenUIDs.add(person.uid);



        const Station_API_URL =
  `https://jamesriver.fellowshiponego.com/api/v2/checkin/station/${person.stationId}`;

        const resStation = await fetch(Station_API_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-SessionID": f1Key,
          },
        });

        const Station = await resStation.json();

        // Desktop popup notification
        notifier.notify({
          title: "New Check-in Alert",
          message: `${person.fname} ${person.lname} @ Station ${Station.data.name}`,
          sound: true,
        });

        console.log(
          `🔔 New person: ${person.fname} ${person.lname} @ Station ${Station.data.name}`
        );
      }
    }
  } catch (err) {
    console.error("Error fetching API:", err);
  }
}

// Run every 5 seconds
setInterval(checkPeople, 5000);
