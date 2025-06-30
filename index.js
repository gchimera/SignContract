import express from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/' });

async function embedImageFromUrl(pdfDoc, imageUrl) {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const contentType = response.headers['content-type'];

  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return await pdfDoc.embedJpg(response.data);
  } else if (contentType.includes('png')) {
    return await pdfDoc.embedPng(response.data);
  } else {
    throw new Error('Unsupported image type: ' + contentType);
  }
}

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

    // Customer signature
    if (customerSignatureUrl) {
      const customerSignatureImage = await embedImageFromUrl(pdfDoc, customerSignatureUrl);
      const customerDims = customerSignatureImage.scale(0.2);
      lastPage.drawImage(customerSignatureImage, {
        x: width - customerDims.width - 50,
        y: 50,
        width: customerDims.width,
        height: customerDims.height,
      });
    }

    // Company signature
    if (companySignatureUrl) {
      const companySignatureImage = await embedImageFromUrl(pdfDoc, companySignatureUrl);
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
