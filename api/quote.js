// POST /api/quote
//
// Saves a generated quote to the FIN MAKER App Airtable base.
// One record per quote. PDF + DXF attached to the row. Customer
// gets the PDF download triggered client-side; DXF stays internal.
//
// Request body:
//   { email, code, designJSON, wallSpec, totalPrice,
//     pdfBase64, pdfFilename, dxfText, dxfFilename,
//     projectName?, firm? }
//
// Response:
//   { ok: true, code, recordId }  on success
//   { ok: false, error }          on failure

import { checkRateLimit, rateLimitResponse } from "./_rateLimit.js";

const AIRTABLE_BASE_ID = "appmXXG57Mx4ykzqV";
const AIRTABLE_TABLE_ID = "tblnIFI3Ls4dNdaQA";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // PDF + DXF can be a few MB combined
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Rate limit: quote generation is cheap per call but each one writes an
  // Airtable row + uploads PDF + DXF. Cap per-IP to 10/hour to prevent spam.
  const rl = await checkRateLimit(req, "quote", { limit: 10, windowSec: 3600 });
  if (!rl.allowed) return rateLimitResponse(res, rl);

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res
      .status(500)
      .json({ ok: false, error: "AIRTABLE_TOKEN not configured" });
  }

  const {
    email,
    code,
    designJSON,
    wallSpec,
    totalPrice,
    pdfBase64,
    pdfFilename,
    dxfText,
    dxfFilename,
    projectName,
    firm,
  } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "email and code required" });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Create the record (no attachments yet — those upload separately)
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const createRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: {
            Code: code,
            Date: today,
            Email: email,
            "Project Name": projectName || "",
            Firm: firm || "",
            "Wall Spec": wallSpec || "",
            "Total Price": Number(totalPrice) || 0,
            Status: "Quoted",
            "Design JSON": designJSON || "",
          },
        }),
      }
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error("Airtable record create failed", createRes.status, text);
      return res.status(502).json({
        ok: false,
        error: `Airtable record create failed (${createRes.status})`,
      });
    }
    const created = await createRes.json();
    const recordId = created.id;

    // 2. Upload PDF attachment (Airtable's content endpoint)
    if (pdfBase64) {
      const pdfRes = await fetch(
        `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/PDF/uploadAttachment`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            contentType: "application/pdf",
            file: pdfBase64,
            filename: pdfFilename || `${code}.pdf`,
          }),
        }
      );
      if (!pdfRes.ok) {
        const t = await pdfRes.text();
        console.error("PDF upload failed", pdfRes.status, t);
        // Don't fail the whole request — the record exists, attachment can be re-uploaded
      }
    }

    // 3. Upload DXF attachment (as plain text, base64-encoded)
    if (dxfText) {
      const dxfBase64 = Buffer.from(dxfText, "utf8").toString("base64");
      const dxfRes = await fetch(
        `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/DXF/uploadAttachment`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            contentType: "application/dxf",
            file: dxfBase64,
            filename: dxfFilename || `${code}.dxf`,
          }),
        }
      );
      if (!dxfRes.ok) {
        const t = await dxfRes.text();
        console.error("DXF upload failed", dxfRes.status, t);
      }
    }

    return res.json({ ok: true, code, recordId });
  } catch (err) {
    console.error("Quote endpoint error", err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
