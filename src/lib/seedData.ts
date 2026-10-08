import { hashPassword } from "./auth";
import { prisma } from "./prisma";
import { normalizeVehicleNo } from "./storage";

export async function seedDatabase() {
  // 1. Create Default Users
  const adminPassword = await hashPassword("admin123");
  const fieldPassword = await hashPassword("field123");

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminPassword, role: "ADMIN", name: "Jamnagar Pass Administrator" },
    create: {
      username: "admin",
      name: "Jamnagar Pass Administrator",
      email: "admin@jamnagarpass.in",
      passwordHash: adminPassword,
      role: "ADMIN",
      phone: "+91 98250 11223",
      active: true,
    },
  });

  const fieldUser1 = await prisma.user.upsert({
    where: { username: "field" },
    update: { passwordHash: fieldPassword, role: "FIELD_USER", name: "Ramesh Bhai Patel (Godown Lead)" },
    create: {
      username: "field",
      name: "Ramesh Bhai Patel (Godown Lead)",
      email: "ramesh.field@jamnagarpass.in",
      passwordHash: fieldPassword,
      role: "FIELD_USER",
      phone: "+91 98790 44556",
      active: true,
    },
  });

  const fieldUser2 = await prisma.user.upsert({
    where: { username: "worker" },
    update: { passwordHash: fieldPassword, role: "FIELD_USER", name: "Sunil Sharma (Gate Staff)" },
    create: {
      username: "worker",
      name: "Sunil Sharma (Gate Staff)",
      email: "sunil.field@jamnagarpass.in",
      passwordHash: fieldPassword,
      role: "FIELD_USER",
      phone: "+91 94280 77889",
      active: true,
    },
  });

  // 2. Seed Vendors
  const vendor1 = await prisma.vendor.upsert({
    where: { companyName: "Patel Logistics & Transport Ltd" },
    update: {},
    create: {
      companyName: "Patel Logistics & Transport Ltd",
      vendorRepresentative: "Kirit Patel",
      representativeMobile: "+91 98240 12345",
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { companyName: "Jamnagar Heavy Crane & Rigging" },
    update: {},
    create: {
      companyName: "Jamnagar Heavy Crane & Rigging",
      vendorRepresentative: "Bhavik Jadeja",
      representativeMobile: "+91 99789 67890",
    },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { companyName: "Saurashtra Freight Carriers" },
    update: {},
    create: {
      companyName: "Saurashtra Freight Carriers",
      vendorRepresentative: "Manish Shah",
      representativeMobile: "+91 94260 55443",
    },
  });

  // 3. Seed Drivers
  const driver1 = await prisma.driver.upsert({
    where: { id: "seed-driver-1" },
    update: {},
    create: {
      id: "seed-driver-1",
      name: "Abbas Wani",
      mobile: "+91 98791 23456",
      dob: "14/04/1979",
      gender: "Male",
      aadhaarNumber: "8589 0807 7842",
      licenseNumber: "GJ10 20180098421",
      licenseValidTo: "13/04/2039",
      transportValidTo: "11/03/2028",
      bloodGroup: "O+",
      addressTaluka: "Lalpur",
      addressDistrict: "Jamnagar",
      addressState: "Gujarat",
      addressPincode: "361140",
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { id: "seed-driver-2" },
    update: {},
    create: {
      id: "seed-driver-2",
      name: "Dilip Parmar",
      mobile: "+91 94270 98765",
      dob: "05/11/1986",
      gender: "Male",
      aadhaarNumber: "7412 9087 1123",
      licenseNumber: "GJ03 20150045211",
      licenseValidTo: "04/11/2046",
      transportValidTo: "20/09/2027",
      bloodGroup: "B+",
      addressTaluka: "Jamnagar",
      addressDistrict: "Jamnagar",
      addressState: "Gujarat",
      addressPincode: "361001",
    },
  });

  // 4. Seed Vehicles
  const vNo1 = "GJ 10 AB 1234";
  const norm1 = normalizeVehicleNo(vNo1);
  const vehicle1 = await prisma.vehicle.upsert({
    where: { normalizedVehicleNumber: norm1 },
    update: {},
    create: {
      vehicleNumber: vNo1,
      normalizedVehicleNumber: norm1,
      vehicleType: "Truck",
      classOfVehicle: "Heavy Goods Vehicle",
      manufacturer: "Tata Motors",
      model: "Signa 4825.TK",
      registrationDate: "15/06/2021",
      insuranceValidity: "14/06/2027",
      pucValidity: "09/01/2027",
      fitnessValidity: "14/06/2026",
    },
  });

  const vNo2 = "GJ 10 TX 5521";
  const norm2 = normalizeVehicleNo(vNo2);
  const vehicle2 = await prisma.vehicle.upsert({
    where: { normalizedVehicleNumber: norm2 },
    update: {},
    create: {
      vehicleNumber: vNo2,
      normalizedVehicleNumber: norm2,
      vehicleType: "Hydra Crane",
      classOfVehicle: "Special Vehicle",
      manufacturer: "ACE Cranes",
      model: "14XW",
      registrationDate: "10/02/2022",
      insuranceValidity: "09/02/2027",
      pucValidity: "12/12/2026",
      fitnessValidity: "09/02/2027",
    },
  });

  // 5. Seed Submissions (Pending, Approved, WhatsApp, Draft)
  // Check if submissions exist
  const count = await prisma.submission.count();
  if (count === 0) {
    // Submission 1: Pending Admin Verification (with 1 mismatch warning for realistic demo!)
    const sub1 = await prisma.submission.create({
      data: {
        submissionNo: "JAM-2026-1042",
        sourceType: "SOURCE_APP",
        status: "ADMIN_REVIEW",
        currentStep: 4,
        vehicleId: vehicle1.id,
        driverId: driver1.id,
        vendorId: vendor1.id,
        createdById: fieldUser1.id,
        vehicleNumber: "GJ 10 AB 1234",
        normalizedVehicleNo: norm1,
        vehicleType: "Truck",
        driverName: "Abbas Wani",
        driverMobile: "+91 98791 23456",
        driverDob: "14/04/1979",
        companyName: "Patel Logistics & Transport Ltd",
        designation: "Driver",
        vendorRepresentative: "Kirit Patel",
        vendorRepMobile: "+91 98240 12345",
        addressTaluka: "Lalpur",
        addressDistrict: "Jamnagar",
        addressState: "Gujarat",
        addressPincode: "361140",
        areaOfWork: "RG",
        validityRequired: "1 Month",
        aadhaarNumber: "8589 0807 7842",
        licenseNumber: "GJ10 20180098421",
        licenseValidTo: "13/04/2039",
        insurancePolicyNo: "3001/2026/89412",
        insuranceCompany: "ICICI Lombard General Insurance",
        insuranceValidTo: "14/06/2027",
        pucCertificateNo: "GJ10009842100",
        pucValidTo: "09/01/2027",
        rcOwnerName: "Patel Logistics & Transport Ltd",
        fieldVerified: true,
        adminVerified: false,
        mismatchCount: 1,
        submittedAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
      },
    });

    // Create extractions for sub1
    await prisma.documentExtraction.create({
      data: {
        submissionId: sub1.id,
        category: "RC",
        extractedFields: JSON.stringify({
          vehicle_number: { value: "GJ10AB1234", confidence: 0.98 },
          owner_name: { value: "Patel Logistics & Transport Ltd", confidence: 0.95 },
          vehicle_type: { value: "Heavy Goods Truck", confidence: 0.92 },
          class_of_vehicle: { value: "HGV", confidence: 0.94 },
          engine_number: { value: "TATA697TCIC098214", confidence: 0.91 },
          chassis_number: { value: "MAT412034M1N12894", confidence: 0.93 },
        }),
        confidenceScore: 0.95,
        status: "SUCCESS",
      },
    });

    await prisma.documentExtraction.create({
      data: {
        submissionId: sub1.id,
        category: "INSURANCE",
        extractedFields: JSON.stringify({
          vehicle_number: { value: "GJ10AB1294", confidence: 0.88 }, // Mismatch for demo verification!
          policy_number: { value: "3001/2026/89412", confidence: 0.94 },
          insurance_company: { value: "ICICI Lombard General Insurance", confidence: 0.96 },
          policy_end_date: { value: "14/06/2027", confidence: 0.91 },
        }),
        confidenceScore: 0.92,
        status: "SUCCESS",
      },
    });

    await prisma.documentExtraction.create({
      data: {
        submissionId: sub1.id,
        category: "AADHAAR",
        extractedFields: JSON.stringify({
          name: { value: "Abbas Wani", confidence: 0.99 },
          date_of_birth: { value: "14/04/1979", confidence: 0.97 },
          aadhaar_number: { value: "8589 0807 7842", confidence: 0.99 },
          pincode: { value: "361140", confidence: 0.95 },
          taluka: { value: "Lalpur", confidence: 0.92 },
          district: { value: "Jamnagar", confidence: 0.95 },
          state: { value: "Gujarat", confidence: 0.98 },
        }),
        confidenceScore: 0.97,
        status: "SUCCESS",
      },
    });

    // Submission 2: Approved Entry (with EP and VAP records ready for export)
    const sub2 = await prisma.submission.create({
      data: {
        submissionNo: "JAM-2026-1041",
        sourceType: "SOURCE_APP",
        status: "APPROVED",
        currentStep: 5,
        vehicleId: vehicle2.id,
        driverId: driver2.id,
        vendorId: vendor2.id,
        createdById: fieldUser2.id,
        approvedById: adminUser.id,
        vehicleNumber: "GJ 10 TX 5521",
        normalizedVehicleNo: norm2,
        vehicleType: "Hydra Crane",
        driverName: "Dilip Parmar",
        driverMobile: "+91 94270 98765",
        driverDob: "05/11/1986",
        companyName: "Jamnagar Heavy Crane & Rigging",
        designation: "Driver",
        vendorRepresentative: "Bhavik Jadeja",
        vendorRepMobile: "+91 99789 67890",
        addressTaluka: "Jamnagar",
        addressDistrict: "Jamnagar",
        addressState: "Gujarat",
        addressPincode: "361001",
        areaOfWork: "AF",
        validityRequired: "3 Months",
        aadhaarNumber: "7412 9087 1123",
        licenseNumber: "GJ03 20150045211",
        licenseValidTo: "04/11/2046",
        fieldVerified: true,
        adminVerified: true,
        mismatchCount: 0,
        submittedAt: new Date(Date.now() - 3600000 * 8),
        approvedAt: new Date(Date.now() - 3600000 * 2),
      },
    });

    await prisma.ePRecord.create({
      data: {
        submissionId: sub2.id,
        srNo: 1,
        personName: "Dilip Parmar",
        dob: "05/11/1986",
        companyName: "Jamnagar Heavy Crane & Rigging",
        designation: "Driver",
        aadhaarNo: "7412 9087 1123",
        photoUrl: "DRIVER_PHOTO/seed_photo.jpg",
        validityRequired: "3 Months",
        areaOfWork: "AF",
        taluka: "Jamnagar",
        district: "Jamnagar",
        state: "Gujarat",
        pincode: "361001",
        mobileNo: "+91 94270 98765",
      },
    });

    await prisma.vAPRecord.create({
      data: {
        submissionId: sub2.id,
        vehicleNo: "GJ 10 TX 5521",
        vehicleType: "Hydra Crane",
        driverName: "Dilip Parmar",
        licenseNo: "GJ03 20150045211",
        originalLicensePresent: "Yes",
        originalPucPresent: "Yes",
        originalInsurancePresent: "Yes",
        driverMob: "+91 94270 98765",
        vendorRep: "Bhavik Jadeja",
        repMob: "+91 99789 67890",
      },
    });

    // Submission 3: Manual WhatsApp Entry
    await prisma.submission.create({
      data: {
        submissionNo: "JAM-2026-1043",
        sourceType: "SOURCE_WHATSAPP",
        status: "ADMIN_REVIEW",
        currentStep: 3,
        createdById: adminUser.id,
        vehicleNumber: "GJ 03 BW 9901",
        normalizedVehicleNo: "GJ03BW9901",
        vehicleType: "Tanker",
        driverName: "Mukesh Solanki",
        driverMobile: "+91 98251 90876",
        driverDob: "22/08/1982",
        companyName: "Saurashtra Freight Carriers",
        designation: "Driver",
        vendorRepresentative: "Manish Shah",
        vendorRepMobile: "+91 94260 55443",
        addressTaluka: "Kalavad",
        addressDistrict: "Jamnagar",
        addressState: "Gujarat",
        addressPincode: "361160",
        areaOfWork: "Jetty",
        validityRequired: "1 Month",
        fieldVerified: false,
        adminVerified: false,
        remarks: "Received through WhatsApp logistics group",
        submittedAt: new Date(Date.now() - 3600000 * 1),
      },
    });

    // Submission 4: Incomplete Draft
    await prisma.submission.create({
      data: {
        submissionNo: "JAM-2026-1044",
        sourceType: "SOURCE_APP",
        status: "DRAFT",
        currentStep: 2,
        createdById: fieldUser1.id,
        vehicleNumber: "GJ 10 Z 8472",
        normalizedVehicleNo: "GJ10Z8472",
        vehicleType: "Pickup",
        driverName: "Harish Jadeja",
        driverMobile: "+91 97234 11223",
        companyName: "Patel Logistics & Transport Ltd",
        designation: "Driver",
        areaOfWork: "R&R",
        fieldVerified: false,
        adminVerified: false,
      },
    });
  }

  return { success: true, message: "Seed data initialized successfully." };
}
