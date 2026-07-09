const path = require('path');
const fs = require('fs');
const { formatAdDateForPdf, formatAdDateForPdfNepali, formatAdDateTimeForPdf } = require('./dateUtils');

const LOGO_PATH = path.join(__dirname, '../../public/assets/coat-of-arms.png');
const NEPALI_FONT_REGULAR = path.join(__dirname, '../../public/fonts/NotoSansDevanagari-Regular.ttf');
const NEPALI_FONT_BOLD = path.join(__dirname, '../../public/fonts/NotoSansDevanagari-Bold.ttf');

const DEFAULT_FONTS = { regular: 'Helvetica', bold: 'Helvetica-Bold' };

const COLORS = {
  nepalBlue: '#003893',
  nepalRed: '#DC143C',
  gold: '#B8860B',
  darkBlue: '#0c2340',
  petrolAccent: '#1e40af',
  electricAccent: '#047857',
  text: '#1f2937',
  muted: '#64748b',
  border: '#cbd5e1',
  lightBg: '#f8fafc',
  white: '#ffffff',
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
};

const GOVT = {
  country: 'Government of Nepal',
  ministry: 'Ministry of Physical Infrastructure and Transport',
  department: 'Department of Transport Management',
  address: 'Ekantakuna, Lalitpur, Nepal',
  website: 'www.dotm.gov.np',
};

const GOVT_NE = {
  country: 'नेपाल सरकार',
  ministry: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
  department: 'यातायात व्यवस्था विभाग',
  address: 'एकान्तकुना, ललितपुर, नेपाल',
  website: 'www.dotm.gov.np',
};

const MARGIN = 36;

function logoExists() {
  return fs.existsSync(LOGO_PATH);
}

function nepaliFontsExist() {
  return fs.existsSync(NEPALI_FONT_REGULAR) && fs.existsSync(NEPALI_FONT_BOLD);
}

function registerPdfFonts(doc) {
  if (nepaliFontsExist()) {
    doc.registerFont('Nepali', NEPALI_FONT_REGULAR);
    doc.registerFont('Nepali-Bold', NEPALI_FONT_BOLD);
  }
}

function resolveFonts(lang) {
  if (lang === 'ne' && nepaliFontsExist()) {
    return { regular: 'Nepali', bold: 'Nepali-Bold' };
  }
  return DEFAULT_FONTS;
}

function createPdfDoc(options = {}) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    ...options,
  });
  registerPdfFonts(doc);
  return doc;
}

function pageWidth(doc) {
  return doc.page.width - MARGIN * 2;
}

function drawWatermark(doc) {
  if (!logoExists()) return;

  const centerX = doc.page.width / 2 - 110;
  const centerY = doc.page.height / 2 - 110;

  doc.save();
  doc.opacity(0.06);
  doc.image(LOGO_PATH, centerX, centerY, { width: 220, height: 220 });
  doc.opacity(1);
  doc.restore();
}

function drawDocumentFrame(doc, accentColor = COLORS.nepalBlue) {
  const inset = 18;
  const w = doc.page.width;
  const h = doc.page.height;

  doc.save();
  doc.lineWidth(2.5);
  doc.strokeColor(COLORS.gold);
  doc.rect(inset, inset, w - inset * 2, h - inset * 2).stroke();

  doc.lineWidth(1);
  doc.strokeColor(accentColor);
  doc.rect(inset + 6, inset + 6, w - (inset + 6) * 2, h - (inset + 6) * 2).stroke();
  doc.restore();
}

function drawGovtHeader(doc, {
  title,
  subtitle,
  badge,
  accentColor = COLORS.nepalBlue,
  govt = GOVT,
} = {}, fonts = DEFAULT_FONTS) {
  const startY = MARGIN + 8;
  let y = startY;

  if (logoExists()) {
    doc.image(LOGO_PATH, doc.page.width / 2 - 28, y, { width: 56, height: 56 });
    y += 62;
  } else {
    y += 10;
  }

  doc.font(fonts.bold).fontSize(13).fillColor(COLORS.nepalRed)
    .text(govt.country, MARGIN, y, { width: pageWidth(doc), align: 'center' });
  y = doc.y + 6;

  doc.font(fonts.regular).fontSize(10).fillColor(COLORS.muted)
    .text(govt.ministry, MARGIN, y, { width: pageWidth(doc), align: 'center' });
  y = doc.y + 2;
  doc.text(govt.department, MARGIN, y, { width: pageWidth(doc), align: 'center' });
  y = doc.y + 10;

  if (badge) {
    const badgeWidth = doc.widthOfString(badge, { font: fonts.bold, size: 8 }) + 20;
    const badgeX = doc.page.width / 2 - badgeWidth / 2;
    doc.roundedRect(badgeX, y, badgeWidth, 18, 4).fill(accentColor);
    doc.font(fonts.bold).fontSize(8).fillColor(COLORS.white)
      .text(badge, badgeX, y + 5, { width: badgeWidth, align: 'center' });
    y += 26;
  }

  doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1.5).strokeColor(accentColor).stroke();
  y += 12;

  doc.font(fonts.bold).fontSize(16).fillColor(COLORS.darkBlue)
    .text(title, MARGIN, y, { width: pageWidth(doc), align: 'center' });
  y = doc.y + 4;

  if (subtitle) {
    doc.font(fonts.regular).fontSize(10).fillColor(COLORS.muted)
      .text(subtitle, MARGIN, y, { width: pageWidth(doc), align: 'center' });
    y = doc.y + 4;
  }

  doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  doc.y = y + 14;
  doc.fillColor(COLORS.text);
}

function drawMetaBar(doc, items = [], fonts = DEFAULT_FONTS) {
  const barY = doc.y;
  const barHeight = 34;
  doc.rect(MARGIN, barY, pageWidth(doc), barHeight).fill(COLORS.lightBg).stroke(COLORS.border);

  const colWidth = pageWidth(doc) / items.length;
  items.forEach((item, index) => {
    const x = MARGIN + colWidth * index + 10;
    doc.font(fonts.bold).fontSize(7).fillColor(COLORS.muted)
      .text(item.label.toUpperCase(), x, barY + 7, { width: colWidth - 16 });
    doc.font(fonts.regular).fontSize(9).fillColor(COLORS.text)
      .text(String(item.value || 'N/A'), x, barY + 18, { width: colWidth - 16 });
  });

  doc.y = barY + barHeight + 16;
}

function drawSectionTitle(doc, title, accentColor = COLORS.nepalBlue, fonts = DEFAULT_FONTS) {
  const y = doc.y;
  doc.rect(MARGIN, y, 4, 16).fill(accentColor);
  doc.font(fonts.bold).fontSize(11).fillColor(COLORS.darkBlue)
    .text(title, MARGIN + 10, y + 2);
  doc.y = y + 24;
}

function drawKeyValueGrid(doc, rows, columns = 2, fonts = DEFAULT_FONTS) {
  const colWidth = pageWidth(doc) / columns;
  const rowHeight = 28;
  let startY = doc.y;
  let col = 0;
  let row = 0;

  rows.forEach((item) => {
    const x = MARGIN + col * colWidth;
    const y = startY + row * rowHeight;

    doc.rect(x, y, colWidth - 6, rowHeight - 2).fill(COLORS.lightBg).stroke(COLORS.border);
    doc.font(fonts.bold).fontSize(8).fillColor(COLORS.muted)
      .text(item.label, x + 8, y + 5, { width: colWidth - 20 });
    doc.font(fonts.regular).fontSize(9).fillColor(COLORS.text)
      .text(String(item.value || 'N/A'), x + 8, y + 15, { width: colWidth - 20 });

    col += 1;
    if (col >= columns) {
      col = 0;
      row += 1;
    }
  });

  const totalRows = Math.ceil(rows.length / columns);
  doc.y = startY + totalRows * rowHeight + 10;
}

function drawInsightBox(doc, title, insights = [], accentColor = COLORS.nepalBlue, fonts = DEFAULT_FONTS) {
  const boxY = doc.y;
  const boxHeight = 24 + insights.length * 16;
  doc.rect(MARGIN, boxY, pageWidth(doc), boxHeight).fill('#eff6ff').stroke(accentColor);

  doc.font(fonts.bold).fontSize(10).fillColor(accentColor)
    .text(title, MARGIN + 12, boxY + 8);

  let y = boxY + 24;
  insights.forEach((insight) => {
    doc.font(fonts.regular).fontSize(9).fillColor(COLORS.text)
      .text(`- ${insight}`, MARGIN + 14, y, { width: pageWidth(doc) - 28 });
    y += 16;
  });

  doc.y = boxY + boxHeight + 14;
}

function drawStatCards(doc, stats = []) {
  const cardsPerRow = Math.min(stats.length, 4);
  const cardWidth = (pageWidth(doc) - (cardsPerRow - 1) * 8) / cardsPerRow;
  const cardHeight = 52;
  const startY = doc.y;

  stats.forEach((stat, index) => {
    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;
    const x = MARGIN + col * (cardWidth + 8);
    const y = startY + row * (cardHeight + 8);

    doc.roundedRect(x, y, cardWidth, cardHeight, 4).fill(COLORS.white).stroke(COLORS.border);
    doc.rect(x, y, cardWidth, 4).fill(stat.color || COLORS.nepalBlue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
      .text(stat.label.toUpperCase(), x + 8, y + 12, { width: cardWidth - 16 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.darkBlue)
      .text(String(stat.value), x + 8, y + 28, { width: cardWidth - 16 });
  });

  const rows = Math.ceil(stats.length / cardsPerRow);
  doc.y = startY + rows * (cardHeight + 8) + 10;
}

function drawDataTable(doc, columns, rows, options = {}) {
  const tableLeft = MARGIN;
  const tableWidth = pageWidth(doc);
  const headerHeight = 24;
  const rowHeight = options.rowHeight || 22;
  const accentColor = options.accentColor || COLORS.nepalBlue;

  const drawHeader = (y) => {
    doc.rect(tableLeft, y, tableWidth, headerHeight).fill(COLORS.darkBlue);
    let x = tableLeft;
    columns.forEach((col) => {
      const colWidth = tableWidth * col.width;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white)
        .text(col.name, x + 6, y + 7, { width: colWidth - 12 });
      x += colWidth;
    });
    return y + headerHeight;
  };

  let currentY = drawHeader(doc.y);

  rows.forEach((row, index) => {
    if (currentY > doc.page.height - MARGIN - 60) {
      doc.addPage();
      drawWatermark(doc);
      drawDocumentFrame(doc, accentColor);
      doc.y = MARGIN + 20;
      currentY = drawHeader(doc.y);
    }

    if (index % 2 === 0) {
      doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill(COLORS.lightBg);
    }

    let x = tableLeft;
    columns.forEach((col, colIndex) => {
      const colWidth = tableWidth * col.width;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
        .text(String(row[colIndex] ?? 'N/A'), x + 6, currentY + 6, { width: colWidth - 12 });
      x += colWidth;
    });

    doc.moveTo(tableLeft, currentY + rowHeight).lineTo(tableLeft + tableWidth, currentY + rowHeight)
      .strokeColor(COLORS.border).stroke();
    currentY += rowHeight;
  });

  doc.rect(tableLeft, doc.y, tableWidth, currentY - doc.y).stroke(COLORS.border);
  doc.y = currentY + 16;
}

function drawSignatureBlock(doc, labels = {}, fonts = DEFAULT_FONTS) {
  if (doc.y > doc.page.height - MARGIN - 90) {
    doc.addPage();
    drawWatermark(doc);
    drawDocumentFrame(doc);
    doc.y = MARGIN + 30;
  }

  const officerTitle = labels.officerTitle || 'Authorized Officer';
  const departmentLine = labels.departmentLine || 'Department of Transport Management';
  const sealTop = labels.sealTop || 'OFFICIAL';
  const sealBottom = labels.sealBottom || 'SEAL';

  const y = doc.page.height - MARGIN - 75;
  const leftX = MARGIN + 20;
  const rightX = doc.page.width - MARGIN - 170;

  doc.moveTo(leftX, y).lineTo(leftX + 140, y).strokeColor(COLORS.text).stroke();
  doc.font(fonts.bold).fontSize(8).fillColor(COLORS.text)
    .text(officerTitle, leftX, y + 6, { width: 140, align: 'center' });
  doc.font(fonts.regular).fontSize(7).fillColor(COLORS.muted)
    .text(departmentLine, leftX, y + 18, { width: 140, align: 'center' });

  doc.circle(rightX + 70, y - 18, 28).lineWidth(1).strokeColor(COLORS.gold).stroke();
  doc.font(fonts.bold).fontSize(6).fillColor(COLORS.nepalRed)
    .text(sealTop, rightX + 42, y - 24, { width: 56, align: 'center' });
  doc.text(sealBottom, rightX + 42, y - 16, { width: 56, align: 'center' });

  doc.y = y + 35;
}

function drawDocumentFooter(doc, lines = [], fonts = DEFAULT_FONTS) {
  const footerY = doc.page.height - MARGIN - 28;
  doc.moveTo(MARGIN, footerY).lineTo(doc.page.width - MARGIN, footerY).strokeColor(COLORS.border).stroke();

  const defaultLines = [
    'This is a computer-generated official document issued by the Department of Transport Management.',
    `${GOVT.address} | ${GOVT.website}`,
  ];
  const footerLines = lines.length ? lines : defaultLines;

  footerLines.forEach((line, i) => {
    doc.font(fonts.regular).fontSize(7).fillColor(COLORS.muted)
      .text(line, MARGIN, footerY + 8 + i * 10, { width: pageWidth(doc), align: 'center' });
  });
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
      .text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.width - MARGIN - 60, doc.page.height - MARGIN - 10, {
        width: 60,
        align: 'right',
      });
  }
}

function getTaxStatus(taxExpireDate) {
  if (!taxExpireDate) return 'Unknown';
  const expire = new Date(taxExpireDate);
  const now = new Date();
  const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Expired (${Math.abs(daysLeft)} days ago)`;
  if (daysLeft <= 30) return `Expiring soon (${daysLeft} days left)`;
  return `Valid (${daysLeft} days left)`;
}

function getTaxStatusNepali(taxExpireDate) {
  if (!taxExpireDate) return 'अज्ञात';
  const expire = new Date(taxExpireDate);
  const now = new Date();
  const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `समाप्त भएको (${Math.abs(daysLeft)} दिन अघि)`;
  if (daysLeft <= 30) return `चाँडै समाप्त हुँदै (${daysLeft} दिन बाँकी)`;
  return `मान्य (${daysLeft} दिन बाँकी)`;
}

function translateStatus(status, lang) {
  const normalized = String(status || 'pending').toLowerCase();
  if (lang === 'ne') {
    const map = {
      pending: 'विचाराधीन',
      approved: 'स्वीकृत',
      verified: 'प्रमाणित',
      rejected: 'अस्वीकृत',
      active: 'सक्रिय',
      inactive: 'निष्क्रिय',
    };
    return map[normalized] || normalized.toUpperCase();
  }
  return normalized.toUpperCase();
}

function buildBluebookCertificateContent(bluebookData, vehicleCategory, lang) {
  const isElectric = vehicleCategory === 'electric';
  const regDate = isElectric ? bluebookData.vehicleRegistrationDate : bluebookData.VehicleRegistrationDate;
  const formatDate = lang === 'ne' ? formatAdDateForPdfNepali : formatAdDateForPdf;
  const taxStatus = lang === 'ne'
    ? getTaxStatusNepali(bluebookData.taxExpireDate)
    : getTaxStatus(bluebookData.taxExpireDate);
  const statusLabel = translateStatus(bluebookData.status, lang);
  const na = lang === 'ne' ? 'उपलब्ध छैन' : 'N/A';

  if (lang === 'ne') {
    return {
      govt: GOVT_NE,
      title: isElectric ? 'विद्युतीय सवारी दर्ता प्रमाणपत्र' : 'सवारी साधन दर्ता प्रमाणपत्र',
      subtitle: 'आधिकारिक सवारी दर्ता कागजात (ब्लुबुक)',
      badge: isElectric ? 'विद्युतीय सवारी' : 'मोटर सवारी',
      meta: [
        { label: 'प्रमाणपत्र नं.', value: String(bluebookData._id).slice(-12).toUpperCase() },
        { label: 'दर्ता नं.', value: bluebookData.vehicleRegNo },
        { label: 'जारी मिति (वि.सं.)', value: formatDate(new Date().toISOString()) },
        { label: 'स्थिति', value: statusLabel },
      ],
      vehicleSection: 'सवारी विवरण',
      vehicleRows: [
        { label: 'सवारी दर्ता नं.', value: bluebookData.vehicleRegNo },
        { label: 'सवारी प्रकार', value: bluebookData.vehicleType },
        { label: 'निर्माता / मोडेल', value: bluebookData.vehicleModel },
        { label: 'निर्माण वर्ष', value: bluebookData.manufactureYear },
        { label: 'सवारी नं.', value: bluebookData.vehicleNumber },
        { label: 'चेसिस नं.', value: bluebookData.chasisNumber },
        { label: 'रङ', value: bluebookData.vehicleColor },
        isElectric
          ? { label: 'ब्याट्री क्षमता', value: bluebookData.vehicleBatteryCapacity ? `${bluebookData.vehicleBatteryCapacity} kWh` : na }
          : { label: 'इन्जिन क्षमता', value: bluebookData.vehicleEngineCC ? `${bluebookData.vehicleEngineCC} CC` : na },
      ],
      ownerSection: 'मालिक तथा दर्ता',
      ownerRows: [
        { label: 'दर्ता भएको मालिक', value: bluebookData.vehicleOwnerName },
        { label: 'दर्ता मिति (वि.सं.)', value: formatDate(regDate) },
        { label: 'इन्धन / शक्ति प्रकार', value: isElectric ? 'विद्युत (ब्याट्री)' : 'पेट्रोल / डिजेल' },
        { label: 'कागजात श्रेणी', value: isElectric ? 'विद्युतीय ब्लुबुक' : 'मोटर सवारी ब्लुबुक' },
      ],
      taxSection: 'कर तथा म्याद',
      taxRows: [
        { label: 'अन्तिम कर भुक्तानी (वि.सं.)', value: formatDate(bluebookData.taxPayDate) },
        { label: 'कर म्याद सम्म (वि.सं.)', value: formatDate(bluebookData.taxExpireDate) },
        { label: 'कर स्थिति', value: taxStatus },
        { label: 'प्रमाणीकरण स्थिति', value: statusLabel },
      ],
      insightTitle: 'प्रमाणपत्र टिप्पणी',
      insights: [
        'यो प्रमाणपत्रले यातायात व्यवस्था विभागमा राखिएको सवारी दर्ता विवरण पुष्टि गर्दछ।',
        `कर म्याद विक्रम सम्बत् (वि.सं.) मितिमा अभिलेखित छ। हालको कर स्थिति: ${taxStatus}।`,
        'यातायात प्राधिकरणले माग गर्दा मूल ब्लुबुकसँगै यो कागजात प्रस्तुत गर्नुहोस्।',
      ],
      signature: {
        officerTitle: 'अनुमोदन अधिकारी',
        departmentLine: 'यातायात व्यवस्था विभाग',
        sealTop: 'आधिकारिक',
        sealBottom: 'छाप',
      },
      footer: [
        'प्रमाणपत्र नं. प्रयोग गरी कुनै पनि यातायात कार्यालयमा प्रामाणिकता जाँच गर्न सकिन्छ।',
        `${GOVT_NE.department} | ${GOVT_NE.address}`,
      ],
    };
  }

  return {
    govt: GOVT,
    title: isElectric ? 'Electric Vehicle Registration Certificate' : 'Vehicle Registration Certificate',
    subtitle: 'Official Vehicle Registration Document (Bluebook)',
    badge: isElectric ? 'ELECTRIC VEHICLE' : 'MOTOR VEHICLE',
    meta: [
      { label: 'Certificate No.', value: String(bluebookData._id).slice(-12).toUpperCase() },
      { label: 'Registration No.', value: bluebookData.vehicleRegNo },
      { label: 'Issue Date (BS)', value: formatDate(new Date().toISOString()) },
      { label: 'Status', value: statusLabel },
    ],
    vehicleSection: 'Vehicle Particulars',
    vehicleRows: [
      { label: 'Vehicle Registration No.', value: bluebookData.vehicleRegNo },
      { label: 'Vehicle Type', value: bluebookData.vehicleType },
      { label: 'Make / Model', value: bluebookData.vehicleModel },
      { label: 'Manufacture Year', value: bluebookData.manufactureYear },
      { label: 'Vehicle Number', value: bluebookData.vehicleNumber },
      { label: 'Chassis Number', value: bluebookData.chasisNumber },
      { label: 'Colour', value: bluebookData.vehicleColor },
      isElectric
        ? { label: 'Battery Capacity', value: bluebookData.vehicleBatteryCapacity ? `${bluebookData.vehicleBatteryCapacity} kWh` : 'N/A' }
        : { label: 'Engine Capacity', value: bluebookData.vehicleEngineCC ? `${bluebookData.vehicleEngineCC} CC` : 'N/A' },
    ],
    ownerSection: 'Owner & Registration',
    ownerRows: [
      { label: 'Registered Owner', value: bluebookData.vehicleOwnerName },
      { label: 'Registration Date (BS)', value: formatDate(regDate) },
      { label: 'Fuel / Power Type', value: isElectric ? 'Electric (Battery)' : 'Petrol / Diesel' },
      { label: 'Document Category', value: isElectric ? 'Electric Bluebook' : 'Motor Vehicle Bluebook' },
    ],
    taxSection: 'Tax & Validity',
    taxRows: [
      { label: 'Last Tax Payment (BS)', value: formatDate(bluebookData.taxPayDate) },
      { label: 'Tax Valid Until (BS)', value: formatDate(bluebookData.taxExpireDate) },
      { label: 'Tax Status', value: taxStatus },
      { label: 'Verification Status', value: statusLabel },
    ],
    insightTitle: 'Certificate Notes',
    insights: [
      'This certificate confirms vehicle registration records maintained by the Department of Transport Management.',
      `Tax validity is recorded as Bikram Sambat (BS) dates. Current tax status: ${taxStatus}.`,
      'Present this document along with original bluebook when required by transport authorities.',
    ],
    signature: {
      officerTitle: 'Authorized Officer',
      departmentLine: 'Department of Transport Management',
      sealTop: 'OFFICIAL',
      sealBottom: 'SEAL',
    },
    footer: [
      'Verify authenticity using the Certificate No. at any DOTM office.',
      `${GOVT.department} | ${GOVT.address}`,
    ],
  };
}

function renderBluebookCertificatePage(doc, content, accentColor, fonts) {
  drawWatermark(doc);
  drawDocumentFrame(doc, accentColor);

  drawGovtHeader(doc, {
    title: content.title,
    subtitle: content.subtitle,
    badge: content.badge,
    accentColor,
    govt: content.govt,
  }, fonts);

  drawMetaBar(doc, content.meta, fonts);

  drawSectionTitle(doc, content.vehicleSection, accentColor, fonts);
  drawKeyValueGrid(doc, content.vehicleRows, 2, fonts);

  drawSectionTitle(doc, content.ownerSection, accentColor, fonts);
  drawKeyValueGrid(doc, content.ownerRows, 2, fonts);

  drawSectionTitle(doc, content.taxSection, accentColor, fonts);
  drawKeyValueGrid(doc, content.taxRows, 2, fonts);

  drawInsightBox(doc, content.insightTitle, content.insights, accentColor, fonts);

  drawSignatureBlock(doc, content.signature, fonts);
  drawDocumentFooter(doc, content.footer, fonts);
}

function renderBluebookCertificate(doc, bluebookData, vehicleCategory = 'petrol') {
  const isElectric = vehicleCategory === 'electric';
  const accentColor = isElectric ? COLORS.electricAccent : COLORS.petrolAccent;

  const enContent = buildBluebookCertificateContent(bluebookData, vehicleCategory, 'en');
  renderBluebookCertificatePage(doc, enContent, accentColor, resolveFonts('en'));

  doc.addPage();

  const neContent = buildBluebookCertificateContent(bluebookData, vehicleCategory, 'ne');
  renderBluebookCertificatePage(doc, neContent, accentColor, resolveFonts('ne'));

  addPageNumbers(doc);
}

function buildUserInsights(stats) {
  return [
    `${stats.activePercentage}% of registered users are currently active on the platform.`,
    `${stats.verifiedPercentage}% of users have verified their email address.`,
    `${stats.admin} administrator account(s) and ${stats.regular} regular user account(s) are registered.`,
    stats.inactive > 0
      ? `${stats.inactive} inactive account(s) may require review or re-activation.`
      : 'All registered accounts are currently active.',
  ];
}

function buildBluebookInsights(stats) {
  return [
    `${stats.verifiedPercentage}% of all bluebook registrations are verified.`,
    `${stats.petrol} petrol vehicle(s) and ${stats.electric} electric vehicle(s) are on record.`,
    stats.expiringSoon > 0
      ? `${stats.expiringSoon} vehicle(s) have tax expiring within the next 30 days - renewal action recommended.`
      : 'No vehicles have tax expiring within the next 30 days.',
    stats.pending > 0
      ? `${stats.pending} registration(s) are pending verification and require admin action.`
      : 'No pending registrations awaiting verification.',
  ];
}

function buildPaymentInsights(stats) {
  return [
    `Total recorded revenue: Rs. ${stats.successfulAmount} from ${stats.successful} successful payment(s).`,
    `Payment success rate stands at ${stats.successRate}% across all transactions.`,
    `Average transaction value: Rs. ${stats.averageAmount}.`,
    stats.failed > 0
      ? `${stats.failed} failed payment(s) detected - review payment gateway logs for issues.`
      : 'No failed payments recorded in the selected dataset.',
  ];
}

function renderAdminReport(doc, { type, data, statistics }) {
  drawWatermark(doc);
  drawDocumentFrame(doc, COLORS.nepalBlue);

  const reportTitles = {
    users: 'User Registry & Account Analytics Report',
    bluebooks: 'Vehicle Bluebook Registration Report',
    payments: 'Tax Payment & Revenue Report',
  };

  drawGovtHeader(doc, {
    title: reportTitles[type] || 'Administrative Report',
    subtitle: 'Bluebook Renewal System - Management Information Report',
    badge: 'CONFIDENTIAL - ADMIN USE',
    accentColor: COLORS.nepalBlue,
  });

  drawMetaBar(doc, [
    { label: 'Report Type', value: type.charAt(0).toUpperCase() + type.slice(1) },
    { label: 'Generated (BS)', value: formatAdDateForPdf(new Date().toISOString()) },
    { label: 'Generated At', value: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
    { label: 'Total Records', value: data.length },
  ]);

  drawSectionTitle(doc, 'Executive Summary', COLORS.nepalBlue);

  if (type === 'users') {
    drawStatCards(doc, [
      { label: 'Total Users', value: statistics.total, color: COLORS.nepalBlue },
      { label: 'Active Users', value: statistics.active, color: COLORS.success },
      { label: 'Email Verified', value: statistics.verified, color: COLORS.petrolAccent },
      { label: 'Inactive', value: statistics.inactive, color: COLORS.warning },
    ]);
    drawInsightBox(doc, 'Key Insights', buildUserInsights(statistics), COLORS.nepalBlue);
  } else if (type === 'bluebooks') {
    drawStatCards(doc, [
      { label: 'Total Bluebooks', value: statistics.total, color: COLORS.nepalBlue },
      { label: 'Verified', value: statistics.verified, color: COLORS.success },
      { label: 'Pending', value: statistics.pending, color: COLORS.warning },
      { label: 'Tax Expiring Soon', value: statistics.expiringSoon, color: COLORS.danger },
    ]);
    drawInsightBox(doc, 'Key Insights', buildBluebookInsights(statistics), COLORS.nepalBlue);
  } else if (type === 'payments') {
    drawStatCards(doc, [
      { label: 'Total Payments', value: statistics.total, color: COLORS.nepalBlue },
      { label: 'Successful', value: statistics.successful, color: COLORS.success },
      { label: 'Revenue (Rs.)', value: statistics.successfulAmount, color: COLORS.gold },
      { label: 'Success Rate', value: `${statistics.successRate}%`, color: COLORS.petrolAccent },
    ]);
    drawInsightBox(doc, 'Key Insights', buildPaymentInsights(statistics), COLORS.nepalBlue);
  }

  if (data.length > 0) {
    drawSectionTitle(doc, 'Detailed Records', COLORS.nepalBlue);

    if (type === 'users') {
      drawDataTable(doc,
        [
          { name: 'Name', width: 0.2 },
          { name: 'Email', width: 0.28 },
          { name: 'Role', width: 0.1 },
          { name: 'Status', width: 0.12 },
          { name: 'KYC', width: 0.12 },
          { name: 'Registered (BS)', width: 0.18 },
        ],
        data.map((item) => [
          item.name || 'N/A',
          item.email || 'N/A',
          item.role || 'N/A',
          item.status || 'N/A',
          item.kycStatus || 'none',
          formatAdDateForPdf(item.createdAt),
        ])
      );
    } else if (type === 'bluebooks') {
      drawDataTable(doc,
        [
          { name: 'Reg. No', width: 0.14 },
          { name: 'Owner', width: 0.18 },
          { name: 'Model', width: 0.14 },
          { name: 'Type', width: 0.1 },
          { name: 'Category', width: 0.1 },
          { name: 'Status', width: 0.1 },
          { name: 'Tax Until (BS)', width: 0.14 },
          { name: 'Tax Status', width: 0.1 },
        ],
        data.map((item) => [
          item.vehicleRegNo || 'N/A',
          item.vehicleOwnerName || 'N/A',
          item.vehicleModel || 'N/A',
          item.vehicleType || 'N/A',
          item.category || 'Petrol',
          item.status || 'N/A',
          formatAdDateForPdf(item.taxExpireDate),
          getTaxStatus(item.taxExpireDate),
        ])
      );
    } else if (type === 'payments') {
      drawDataTable(doc,
        [
          { name: 'Transaction ID', width: 0.22 },
          { name: 'User', width: 0.18 },
          { name: 'Amount', width: 0.12 },
          { name: 'Method', width: 0.1 },
          { name: 'Category', width: 0.1 },
          { name: 'Status', width: 0.1 },
          { name: 'Date (BS)', width: 0.18 },
        ],
        data.map((item) => [
          item.transactionId || 'N/A',
          item.userId?.name || 'Unknown',
          item.amount ? `Rs. ${item.amount}` : 'N/A',
          item.paymentMethod || 'Khalti',
          item.category || 'Petrol',
          item.status || item.paymentStatus || 'N/A',
          formatAdDateForPdf(item.createdAt),
        ])
      );
    }
  } else {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
      .text('No records found for this report.', MARGIN, doc.y);
    doc.moveDown(2);
  }

  drawDocumentFooter(doc, [
    'This report is generated for internal administrative use by authorized personnel only.',
    `${GOVT.department} - Bluebook Renewal System`,
  ]);

  addPageNumbers(doc);
}

function renderPaymentReceipt(doc, { payment, bluebook, isElectric, user }) {
  const accentColor = COLORS.success;

  drawWatermark(doc);
  drawDocumentFrame(doc, accentColor);

  drawGovtHeader(doc, {
    title: 'Official Payment Receipt',
    subtitle: 'Vehicle Tax Renewal - Bluebook System',
    badge: isElectric ? 'ELECTRIC VEHICLE TAX' : 'MOTOR VEHICLE TAX',
    accentColor,
  });

  drawMetaBar(doc, [
    { label: 'Receipt No.', value: payment.transactionId || String(payment._id).slice(-10) },
    { label: 'Payment Date (BS)', value: formatAdDateForPdf(payment.createdAt) },
    { label: 'Payment Method', value: payment.paymentMethod || 'Khalti' },
    { label: 'Status', value: (payment.status || payment.paymentStatus || 'N/A').toUpperCase() },
  ]);

  drawSectionTitle(doc, 'Payment Details', accentColor);
  drawKeyValueGrid(doc, [
    { label: 'Transaction ID', value: payment.transactionId || 'N/A' },
    { label: 'Amount Paid', value: `Rs. ${payment.amount || 0}` },
    { label: 'Payment Status', value: payment.status || payment.paymentStatus || 'N/A' },
    { label: 'Payment Gateway Ref.', value: payment.pidx || 'N/A' },
    { label: 'Generated On (BS)', value: formatAdDateTimeForPdf(new Date().toISOString()) },
    { label: 'Purpose', value: 'Annual Vehicle Tax Renewal' },
  ]);

  if (user) {
    drawSectionTitle(doc, 'Payer Information', accentColor);
    drawKeyValueGrid(doc, [
      { label: 'Name', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Account Role', value: user.role },
      { label: 'Account Status', value: user.status },
    ], 2);
  }

  if (bluebook) {
    drawSectionTitle(doc, 'Vehicle Covered by This Payment', accentColor);
    drawKeyValueGrid(doc, [
      { label: 'Owner Name', value: bluebook.vehicleOwnerName },
      { label: 'Registration No.', value: bluebook.vehicleRegNo },
      { label: 'Vehicle Model', value: bluebook.vehicleModel },
      { label: 'Vehicle Type', value: bluebook.vehicleType },
      { label: 'Category', value: isElectric ? 'Electric' : 'Petrol' },
      isElectric
        ? { label: 'Battery Capacity', value: bluebook.vehicleBatteryCapacity ? `${bluebook.vehicleBatteryCapacity} kWh` : 'N/A' }
        : { label: 'Engine CC', value: bluebook.vehicleEngineCC ? `${bluebook.vehicleEngineCC} CC` : 'N/A' },
      { label: 'Tax Valid Until (BS)', value: formatAdDateForPdf(bluebook.taxExpireDate) },
      { label: 'Tax Status After Payment', value: getTaxStatus(bluebook.taxExpireDate) },
    ], 2);
  }

  drawInsightBox(doc, 'Receipt Confirmation', [
    'This receipt confirms successful payment of vehicle road tax through the official Bluebook Renewal System.',
    'Retain this document for audit, reimbursement, and future reference at transport offices.',
    payment.status === 'successful' || payment.paymentStatus === 'paid' || payment.paymentStatus === 'successful'
      ? 'Payment has been verified and recorded in the government database.'
      : 'Payment status is pending verification. Contact support if amount was deducted.',
  ], accentColor);

  drawSignatureBlock(doc);
  drawDocumentFooter(doc, [
    'Official tax payment receipt - Department of Transport Management, Nepal.',
    `${GOVT.address} | ${GOVT.website}`,
  ]);
}

module.exports = {
  COLORS,
  GOVT,
  LOGO_PATH,
  createPdfDoc,
  renderBluebookCertificate,
  renderAdminReport,
  renderPaymentReceipt,
  getTaxStatus,
  formatAdDateForPdf,
  formatAdDateTimeForPdf,
};
