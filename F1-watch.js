import dotenv from "dotenv";
import notifier from "node-notifier";

// Load .env variables
dotenv.config();

// Works in Node 16 and 18+
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// 👇 Track seen users per day
let seenUIDs = new Set();
let currentDate = new Date().toDateString();

const API_URL = "https://jamesriver.fellowshiponego.com/js/get_child_checkin_status/all";
const Login_URL = "https://jamesriver.fellowshiponego.com:443/api/user/login";
const Get_Group_URL = `https://jamesriver.fellowshiponego.com/api/v2/groups/${process.env.groupId}`;

const rawLogin = await fetch(Login_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: process.env.usernameForApi,
    password: process.env.password,
  }),
});



var ParsedLogin = await rawLogin.json();

const f1Key = ParsedLogin.data.session_id;

const rawGroup = await fetch(Get_Group_URL, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "X-SessionID": f1Key,
  },
});

var ParsedGroup = await rawGroup.json();

const groupName = ParsedGroup.data.name

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
      json[groupName];

    if (!Array.isArray(alerts)) {
      console.error("Alert group not found or not an array");
      return;
    }

    for (const person of alerts) {
      if (!seenUIDs.has(person.uid)) {
        seenUIDs.add(person.uid);

        const Station_API_URL = `https://jamesriver.fellowshiponego.com/api/v2/checkin/station/${person.stationId}`;

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
setInterval(checkPeople, 2000);
