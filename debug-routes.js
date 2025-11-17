// Debug script to check route exports
console.log("🔍 Checking route files...\n");

try {
  const authRoutes = require("./routes/auth");
  console.log("✅ Auth routes:", typeof authRoutes);
  console.log("   Is function?", typeof authRoutes === "function");
  console.log(
    "   Has stack?",
    authRoutes.stack ? `Yes (${authRoutes.stack.length} routes)` : "No"
  );
  console.log("");
} catch (error) {
  console.log("❌ Auth routes error:", error.message);
  console.log("");
}

try {
  const causeRoutes = require("./routes/causes");
  console.log("✅ Cause routes:", typeof causeRoutes);
  console.log("   Is function?", typeof causeRoutes === "function");
  console.log(
    "   Has stack?",
    causeRoutes.stack ? `Yes (${causeRoutes.stack.length} routes)` : "No"
  );
  console.log("");
} catch (error) {
  console.log("❌ Cause routes error:", error.message);
  console.log("");
}

try {
  const donationRoutes = require("./routes/donations");
  console.log("✅ Donation routes:", typeof donationRoutes);
  console.log("   Is function?", typeof donationRoutes === "function");
  console.log(
    "   Has stack?",
    donationRoutes.stack ? `Yes (${donationRoutes.stack.length} routes)` : "No"
  );
  console.log("");
} catch (error) {
  console.log("❌ Donation routes error:", error.message);
  console.log("");
}

console.log("✅ All checks completed!");
