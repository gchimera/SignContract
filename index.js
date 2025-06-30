import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/sign-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfPath = req.files['pdf'][0].path;
    const signaturePath = req.files['signature'][0].path;
    const companySignatureUrl = req.body.companySignatureUrl;

    // Load PDF
    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Add customer signature
    const signatureImage = fs.readFileSync(signaturePath);
    const signatureImageEmbed = await pdfDoc.embedPng(signatureImage);
    const sigDims = signatureImageEmbed.scale(0.2);

    lastPage.drawImage(signatureImageEmbed, {
      x: width - sigDims.width - 50,
      y: 50,
      width: sigDims.width,
      height: sigDims.height,
    });

    // Fetch and add company signature
    if (companySignatureUrl) {
      const response = await axios.get(companySignatureUrl, { responseType: 'arraybuffer' });
      const companySignatureEmbed = await pdfDoc.embedPng(response.data);
      const compDims = companySignatureEmbed.scale(0.2);

      lastPage.drawImage(companySignatureEmbed, {
        x: width - compDims.width - 50,
        y: 50 + sigDims.height + 10,
        width: compDims.width,
        height: compDims.height,
      });
    }

    // Output signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const outputPath = `uploads/signed_${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, signedPdfBytes);

    res.download(outputPath, () => {
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(signaturePath);
      fs.unlinkSync(outputPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error signing PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF signing API running at http://localhost:${PORT}`);
});
