import express from 'express';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';

const app = express();

// Middleware per leggere JSON e form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.post('/sign-pdf', async (req, res) => {
  try {
    console.log('Request body:', req.body);

    const {
      pdfUrl,
      customerSignatureUrl,
      customerSignatureWidth,
      customerSignatureHeight,
      companySignatureUrl,
      companySignatureWidth,
      companySignatureHeight,
    } = req.body;

    if (!pdfUrl) return res.status(400).send('pdfUrl is required');

    // Scarica PDF
    const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(pdfResponse.data);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Firma cliente
    if (customerSignatureUrl) {
      const customerSignatureImage = await embedImageFromUrl(pdfDoc, customerSignatureUrl);
      const w = parseFloat(customerSignatureWidth) || (customerSignatureImage.width * 0.2);
      const h = parseFloat(customerSignatureHeight) || (customerSignatureImage.height * 0.2);

      lastPage.drawImage(customerSignatureImage, {
        x: width - w - 50,
        y: 50,
        width: w,
        height: h,
      });
    }

    // Firma aziendale
    if (companySignatureUrl) {
      const companySignatureImage = await embedImageFromUrl(pdfDoc, companySignatureUrl);
      const w = parseFloat(companySignatureWidth) || (companySignatureImage.width * 0.2);
      const h = parseFloat(companySignatureHeight) || (companySignatureImage.height * 0.2);

      lastPage.drawImage(companySignatureImage, {
        x: width - w - 50,
        y: 50 + 80,
        width: w,
        height: h,
      });
    }

    const signedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="signed_contract.pdf"');
    res.send(Buffer.from(signedPdfBytes));

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: error.message || 'Error signing PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF signing API listening at http://localhost:${PORT}`);
});