// File: /api/generate-script.js

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`;

// Fungsi handler Vercel
export default async function handler(request, response) {
    // 1. Hanya izinkan metode POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Ambil Kunci API Rahasia dari Vercel Environment Variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return response.status(500).json({ error: "Kunci API Gemini (GEMINI_API_KEY) belum diatur di server Vercel." });
    }

    try {
        // 3. Ambil data (inputs) yang dikirim dari HTML
        const { inputs } = request.body;
        if (!inputs) {
            return response.status(400).json({ error: "Request body 'inputs' diperlukan." });
        }

        // 4. Bangun System Prompt (Instruksi untuk AI)
        // (Ini didasarkan pada preferensi Anda dari file 'index.html' sebelumnya)
        const systemPrompt = `Anda adalah seorang ahli strategi outreach B2B dan copywriter profesional untuk PT Utama Globalindo Cargo.
Tugas Anda adalah menulis skrip outreach (Email atau WhatsApp) berdasarkan parameter yang diberikan.
PERATURAN UTAMA:
1.  Gaya Penulisan: Tulis dalam gaya ${inputs.gaya_bahasa}. Harus jelas, lugas, dan langsung ke intinya.
2.  Hindari Basa-basi: Jangan gunakan bahasa marketing yang berlebihan, frasa generik (contoh: "Saya harap email ini menjumpai Anda dalam keadaan baik"), atau pujian yang tidak perlu.
3.  Fokus pada Nilai: Langsung tawarkan nilai atau solusi yang relevan dengan 'pain point' prospek.
4.  HANYA TULIS TEKS BIASA: Jangan gunakan formatting Markdown (seperti **bold**, *italic*), HTML, atau (underline).
5.  Format Siap Kirim: Hasil harus bisa langsung disalin dan dikirim.
    * Jika Email: Sertakan baris "Subjek:" yang jelas dan menarik di awal. Berikan paragraf yang rapi.
    * Jika WhatsApp: Buat pesan lebih singkat, lebih santai (tapi tetap profesional), dan gunakan poin-poin jika perlu.
6.  Aturan Bahasa: Tulis HANYA dalam bahasa yang diminta (${inputs.bahasa}). Jangan campur bahasa.
7.  Signature: Selalu sertakan signature di akhir.
    * Jika Email: Buat signature lengkap (Nama Pengirim, Jabatan Sales, Nama Perusahaan Asal, HP Sales | Email Sales, Web Perusahaan).
    * Untuk WhatsApp: Buat signature singkat (Nama Pengirim, Jabatan Sales, Nama Perusahaan Asal).`;

        // 5. Bangun User Prompt (Data Dinamis dari Form)
        const userPrompt = `
Platform: ${inputs.platform}
Bahasa yang Diminta: ${inputs.bahasa}
Gaya Bahasa: ${inputs.gaya_bahasa}
Status Prospek: ${inputs.status_prospek}
Tujuan Outreach: ${inputs.tujuan_outreach}
Nama Prospek: ${inputs.nama_pic || "[Nama PIC]"}
Nama Perusahaan: ${inputs.nama_perusahaan_customer || "[Nama Perusahaan Prospek]"}
Produk/Layanan Kami: ${inputs.layanan}
Perkiraan Pain Point Prospek: ${inputs.pain_point}

Info Pengirim:
Nama Pengirim: ${inputs.nama_sales}
Jabatan Sales: ${inputs.jabatan_sales}
Email Sales: ${inputs.email_sales}
HP Sales: ${inputs.hp_sales}
Nama Perusahaan Asal: ${inputs.nama_perusahaan_sales}
Web Perusahaan: ${inputs.web_perusahaan}
Telepon Perusahaan: ${inputs.telp_perusahaan}
Alamat Perusahaan: ${inputs.alamat_perusahaan}

Tugas: Tuliskan skrip outreach sekarang sesuai semua parameter dan system prompt di atas.
`;

        // 6. Siapkan payload untuk dikirim ke Google Gemini
        const payload = {
            contents: [{
                parts: [{ text: userPrompt }]
            }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            // Menambahkan safety settings untuk mengurangi risiko blokir
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ]
        };

        // 7. Panggil API Gemini dari server Vercel
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Error dari Gemini:", errorData);
            // Mengirim error yang lebih jelas ke frontend
            return response.status(geminiResponse.status).json({ 
                error: `Gagal memanggil API Gemini. Status: ${geminiResponse.status}. Pesan: ${errorData.error?.message || 'Unknown Gemini Error'}` 
            });
        }

        const result = await geminiResponse.json();

        // 8. Ekstrak teks dan kirim kembali ke HTML (Frontend)
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            // KIRIM RESPON SUKSES (Format JSON yang diharapkan frontend)
            return response.status(200).json({ script: text });
        } else {
            // Jika Gemini memblokir (safety filter) atau respons kosong
            console.error("Respons Gemini tidak valid:", result);
            return response.status(500).json({ error: "Respons dari Gemini tidak valid atau diblokir (kemungkinan karena safety filter).", details: result });
        }

    } catch (error) {
        console.error("Error internal server Vercel:", error);
        return response.status(500).json({ error: `Terjadi error pada server: ${error.message}` });
    }
}
