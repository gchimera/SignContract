import express from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/sign-pdf', upload.fields([{ name: 'pdf', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files['pdf']) {
      return res.status(400).send('PDF file is missing');
    }

    const pdfPath = req.files['pdf'][0].path;
    const customerSignatureUrl = req.body.customerSignatureUrl;
    const companySignatureUrl = req.body.companySignatureUrl;

    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Add customer signature from URL
    if (customerSignatureUrl) {
      const customerResponse = await axios.get(customerSignatureUrl, { responseType: 'arraybuffer' });
      const customerSignatureImage = await pdfDoc.embedPng(customerResponse.data);
      const customerDims = customerSignatureImage.scale(0.2);

      lastPage.drawImage(customerSignatureImage, {
        x: width - customerDims.width - 50,
        y: 50,
        width: customerDims.width,
        height: customerDims.height,
      });
    }

    // Add company signature from URL
    if (companySignatureUrl) {
      const companyResponse = await axios.get(companySignatureUrl, { responseType: 'arraybuffer' });
      const companySignatureImage = await pdfDoc.embedPng(companyResponse.data);
      const companyDims = companySignatureImage.scale(0.2);

      lastPage.drawImage(companySignatureImage, {
        x: width - companyDims.width - 50,
        y: 50 + 80,
        width: companyDims.width,
        height: companyDims.height,
      });
    }

    const signedPdfBytes = await pdfDoc.save();
    const outputPath = `uploads/signed_${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, signedPdfBytes);

    res.download(outputPath, () => {
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(outputPath);
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Errore durante la firma del PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF signing API listening at http://localhost:${PORT}`);
});
