require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Cause = require("../models/Cause");
const Donation = require("../models/Donation");
const Report = require("../models/Report");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected for Seeding");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  const users = [
    {
      name: "Admin DariKita",
      email: "admin@darikita.com",
      password: "admin123",
      role: "admin",
      phone: "081234567890",
      isVerified: true,
    },
    {
      name: "Auditor DariKita",
      email: "auditor@darikita.com",
      password: "auditor123",
      role: "auditor",
      phone: "081234567891",
      isVerified: true,
    },
    {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      role: "donatur",
      phone: "081234567892",
      isVerified: true,
      totalDonations: 3,
      totalAmount: 1500000,
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password: "password123",
      role: "donatur",
      phone: "081234567893",
      isVerified: true,
      totalDonations: 2,
      totalAmount: 1000000,
    },
    {
      name: "Ahmad Wijaya",
      email: "ahmad@example.com",
      password: "password123",
      role: "donatur",
      phone: "081234567894",
      isVerified: true,
      totalDonations: 1,
      totalAmount: 500000,
    },
  ];

  const createdUsers = await User.insertMany(users);
  console.log("✅ Users seeded:", createdUsers.length);
  return createdUsers;
};

const seedCauses = async (adminUser) => {
  const causes = [
    {
      title: "Bantuan Laptop untuk Mahasiswa Kurang Mampu",
      description:
        "Program bantuan laptop untuk mahasiswa UPNVJ yang membutuhkan perangkat untuk kuliah online dan tugas-tugas akademik. Setiap laptop yang diberikan akan membantu mahasiswa mengakses pendidikan digital dengan lebih baik.",
      category: "pendidikan",
      targetAmount: 50000000,
      currentAmount: 32500000,
      deadline: new Date("2025-03-31"),
      image:
        "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 65,
      progressUpdates: [
        {
          description:
            "Program dimulai dengan target 20 laptop untuk mahasiswa semester 1-4",
          images: [],
          date: new Date("2024-01-15"),
          updatedBy: adminUser._id,
        },
        {
          description:
            "Sudah terkumpul 15 laptop dan telah didistribusikan kepada mahasiswa yang membutuhkan",
          images: [
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
          ],
          date: new Date("2024-01-20"),
          updatedBy: adminUser._id,
        },
      ],
    },
    {
      title: "Beasiswa Prestasi Mahasiswa Berprestasi",
      description:
        "Program beasiswa untuk mahasiswa UPNVJ yang berprestasi namun memiliki keterbatasan ekonomi. Beasiswa ini mencakup biaya kuliah, buku, dan kebutuhan akademik lainnya.",
      category: "pendidikan",
      targetAmount: 75000000,
      currentAmount: 45000000,
      deadline: new Date("2025-04-15"),
      image:
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 90,
      progressUpdates: [
        {
          description:
            "Program beasiswa dibuka untuk 15 mahasiswa berprestasi dengan IPK minimal 3.5",
          images: [],
          date: new Date("2024-01-10"),
          updatedBy: adminUser._id,
        },
      ],
    },
    {
      title: "Bantuan Kesehatan untuk Mahasiswa",
      description:
        "Program bantuan biaya kesehatan untuk mahasiswa yang membutuhkan perawatan medis. Mencakup biaya konsultasi dokter, obat-obatan, dan pemeriksaan kesehatan rutin.",
      category: "kesehatan",
      targetAmount: 30000000,
      currentAmount: 18750000,
      deadline: new Date("2025-05-01"),
      image:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 38,
      progressUpdates: [],
    },
    {
      title: "Bantuan Korban Bencana Alam",
      description:
        "Program bantuan untuk mahasiswa UPNVJ yang terkena dampak bencana alam. Bantuan meliputi kebutuhan pokok, tempat tinggal sementara, dan bantuan akademik.",
      category: "bencana",
      targetAmount: 40000000,
      currentAmount: 15000000,
      deadline: new Date("2025-06-30"),
      image:
        "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 30,
      progressUpdates: [],
    },
    {
      title: "Program Kegiatan Sosial Kampus",
      description:
        "Mendukung kegiatan sosial kemahasiswaan seperti bakti sosial, kegiatan ramadan, dan program pengabdian masyarakat lainnya di lingkungan UPNVJ.",
      category: "sosial",
      targetAmount: 25000000,
      currentAmount: 12000000,
      deadline: new Date("2025-07-31"),
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 24,
      progressUpdates: [],
    },
    {
      title: "Renovasi Perpustakaan Kampus",
      description:
        "Program renovasi dan penambahan fasilitas perpustakaan kampus untuk menciptakan ruang belajar yang lebih nyaman dan modern bagi mahasiswa UPNVJ.",
      category: "infrastruktur",
      targetAmount: 100000000,
      currentAmount: 25000000,
      deadline: new Date("2025-08-31"),
      image:
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800",
      status: "active",
      createdBy: adminUser._id,
      totalDonors: 50,
      progressUpdates: [],
    },
  ];

  const createdCauses = await Cause.insertMany(causes);
  console.log("✅ Causes seeded:", createdCauses.length);
  return createdCauses;
};

const seedDonations = async (users, causes) => {
  const donatur1 = users.find((u) => u.email === "john@example.com");
  const donatur2 = users.find((u) => u.email === "jane@example.com");
  const donatur3 = users.find((u) => u.email === "ahmad@example.com");

  const donations = [
    // Donatur 1 - John Doe
    {
      user: donatur1._id,
      cause: causes[0]._id,
      amount: 500000,
      isAnonymous: false,
      message: "Semoga bermanfaat untuk adik-adik mahasiswa",
      status: "verified",
      paymentMethod: "gopay",
      transactionId: "TRX001",
      verifiedAt: new Date("2024-01-18"),
      distributionStatus: "distributed",
      distributedAt: new Date("2024-01-22"),
    },
    {
      user: donatur1._id,
      cause: causes[1]._id,
      amount: 750000,
      isAnonymous: false,
      message: "Untuk pendidikan generasi muda",
      status: "verified",
      paymentMethod: "bank_transfer",
      transactionId: "TRX002",
      verifiedAt: new Date("2024-01-19"),
      distributionStatus: "distributed",
      distributedAt: new Date("2024-01-25"),
    },
    {
      user: donatur1._id,
      cause: causes[2]._id,
      amount: 250000,
      isAnonymous: false,
      message: "Kesehatan adalah aset penting",
      status: "verified",
      paymentMethod: "gopay",
      transactionId: "TRX003",
      verifiedAt: new Date("2024-01-20"),
      distributionStatus: "pending",
    },
    // Donatur 2 - Jane Smith
    {
      user: donatur2._id,
      cause: causes[0]._id,
      amount: 600000,
      isAnonymous: true,
      message: "",
      status: "verified",
      paymentMethod: "ovo",
      transactionId: "TRX004",
      verifiedAt: new Date("2024-01-21"),
      distributionStatus: "distributed",
      distributedAt: new Date("2024-01-23"),
    },
    {
      user: donatur2._id,
      cause: causes[3]._id,
      amount: 400000,
      isAnonymous: false,
      message: "Ikut membantu saudara yang terkena bencana",
      status: "verified",
      paymentMethod: "bank_transfer",
      transactionId: "TRX005",
      verifiedAt: new Date("2024-01-22"),
      distributionStatus: "pending",
    },
    // Donatur 3 - Ahmad
    {
      user: donatur3._id,
      cause: causes[1]._id,
      amount: 500000,
      isAnonymous: false,
      message: "Semoga program beasiswa ini membantu banyak mahasiswa",
      status: "verified",
      paymentMethod: "dana",
      transactionId: "TRX006",
      verifiedAt: new Date("2024-01-23"),
      distributionStatus: "used",
      distributedAt: new Date("2024-01-28"),
    },
  ];

  const createdDonations = await Donation.insertMany(donations);
  console.log("✅ Donations seeded:", createdDonations.length);
  return createdDonations;
};

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Clear existing data
    await User.deleteMany({});
    await Cause.deleteMany({});
    await Donation.deleteMany({});
    await Report.deleteMany({});
    console.log("🗑️  Cleared existing data\n");

    // Seed data
    const users = await seedUsers();
    const adminUser = users.find((u) => u.role === "admin");
    const causes = await seedCauses(adminUser);
    await seedDonations(users, causes);

    console.log("\n✅ Database seeding completed successfully!\n");
    console.log("═══════════════════════════════════════");
    console.log("📝 TEST ACCOUNTS");
    console.log("═══════════════════════════════════════");
    console.log("\n🔑 ADMIN:");
    console.log("   Email: admin@darikita.com");
    console.log("   Password: admin123");
    console.log("\n🔍 AUDITOR:");
    console.log("   Email: auditor@darikita.com");
    console.log("   Password: auditor123");
    console.log("\n💝 DONATUR 1:");
    console.log("   Email: john@example.com");
    console.log("   Password: password123");
    console.log("\n💝 DONATUR 2:");
    console.log("   Email: jane@example.com");
    console.log("   Password: password123");
    console.log("\n💝 DONATUR 3:");
    console.log("   Email: ahmad@example.com");
    console.log("   Password: password123");
    console.log("\n═══════════════════════════════════════\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

// Run seeder
connectDB().then(seedDatabase);
