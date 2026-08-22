import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method Not Allowed",
      });
    }

    const { lead } = req.body || {};

    if (!lead) {
      return res.status(400).json({
        error: "Missing lead data",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ถ้าไม่มี Gemini API Key ให้ใช้ระบบวิเคราะห์สำรอง
    if (!apiKey) {
      const scoreNum = Number(lead.score || 3);
      const shipVol = parseInt(
        lead.shippingVolume || lead.shipmentsPerDay || "0",
        10
      );
      const callCount = (lead.calls || []).length;

      const winProb = Math.min(
        95,
        Math.max(
          25,
          scoreNum * 14 +
            (shipVol > 50 ? 18 : 8) +
            callCount * 4
        )
      );

      const urgency =
        winProb >= 70
          ? "high"
          : winProb >= 45
          ? "medium"
          : "low";

      return res.json({
        winProbability: winProb,
        dealUrgency: urgency,

        summary: `ร้าน ${lead.shopName || "ไม่ระบุ"} เป็นลูกค้าราย${
          lead.customerType === "corporate"
            ? "นิติบุคคล"
            : "บุคคลธรรมดา"
        } ที่มีปริมาณส่งประมาณ ${
          lead.shippingVolume ||
          lead.shipmentsPerDay ||
          "10-50"
        } ชิ้น/วัน ขนส่งเดิมคือ ${
          lead.competitor ||
          lead.preferredTransport?.[0] ||
          "ไม่ระบุ"
        }`,

        customerPersona: `ผู้ประกอบการร้านค้าในจังหวัด ${
          lead.province || "ไม่ระบุ"
        } ต้องการขนส่งที่ส่งเร็ว มี COD ด่วน และราคาคุ้มค่าเพื่อลดต้นทุน`,

        strengths: [
          `มีปริมาณการส่งพัสดุต่อเนื่อง (${
            lead.shippingVolume ||
            lead.shipmentsPerDay ||
            "10-50"
          } ชิ้น/วัน)`,
          `ระดับความสนใจให้ไว้ที่ ${lead.score || 3}/5 ดาว`,
          lead.customerType === "corporate"
            ? "เป็นรูปแบบนิติบุคคล ความน่าเชื่อถือสูง"
            : "ตัดสินใจได้รวดเร็วระดับเจ้าของร้าน",
        ],

        challenges: [
          lead.competitor ||
          lead.preferredTransport?.[0]
            ? `ปัจจุบันใช้งานขนส่ง ${
                lead.competitor ||
                lead.preferredTransport?.[0]
              } อยู่เดิม อาจต้องการเปรียบเทียบราคา`
            : "ยังไม่เคยลองใช้บริการระบบ Mylogiz",

          (lead.calls || []).filter(
            (c: any) => !c.answered
          ).length > 0
            ? "บางช่วงเวลาไม่สะดวกรับสาย ควรนัดเวลาโทรล่วงหน้า"
            : "ต้องการความมั่นใจเรื่องเวลาเข้ารับพัสดุหน้าร้าน",
        ],

        recommendedAction: `นำเสนอทดลองส่งล็อตแรก ${Math.min(
          50,
          Math.max(10, shipVol || 20)
        )} ชิ้น พร้อมเรตตารางราคาพิเศษ และนัดติดตามผลภายใน 2-3 วัน`,

        salesPitchScript: `"สวัสดีครับ/ค่ะ คุณ${
          lead.contactName || lead.shopName || ""
        } ทาง Mylogiz มีโปรโมชันพิเศษสิทธิ์ส่วนลดตารางราคาและบริการ COD ด่วน สำหรับร้านค้าที่ส่งวันละ ${
          lead.shippingVolume ||
          lead.shipmentsPerDay ||
          "20+"
        } ชิ้น สามารถทดลองส่งล็อตแรกเพื่อวัดความเร็วและบริการได้เลยครับ"`,

        suggestedOffers: [
          "เรตราคาพิเศษสำหรับยอดพัสดุสม่ำเสมอ",
          "ฟรีบริการรถรับพัสดุถึงหน้าร้าน (Pick-up)",
          "ระบบ COD โอนเงินไวภายใน 1 วันทำการ",
        ],
      });
    }

    const aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptText = `คุณคือผู้เชี่ยวชาญด้าน CRM และ Sales Intelligence ของ Mylogiz (บริษัทบริการขนส่งสินค้าและพัสดุ)

โปรดวิเคราะห์ข้อมูลลูกค้าเป้าหมาย (Lead) รายนี้ และประเมินโอกาสปิดการขาย พร้อมคำแนะนำการขายเชิงลึก

ข้อมูลลูกค้า:
- ชื่อร้าน/บริษัท: ${lead.shopName || "ไม่ระบุ"}
- ชื่อผู้ติดต่อ: ${lead.contactName || "ไม่ระบุ"}
- ประเภทลูกค้า: ${
      lead.customerType === "corporate"
        ? "นิติบุคคล"
        : "บุคคลธรรมดา"
    }
- สถานะปัจจุบันในระบบ: ${lead.status || "ไม่ระบุ"}
- ระดับความสนใจ (Lead Score): ${
      lead.score || 0
    } จาก 5 ดาว
- ปริมาณการส่งพัสดุต่อวัน: ${
      lead.shippingVolume ||
      lead.shipmentsPerDay ||
      "ไม่ระบุ"
    }
- ขนส่งที่ใช้อยู่ปัจจุบัน/ขนส่งที่สนใจ: ${
      lead.competitor ||
      (lead.preferredTransport || []).join(", ") ||
      "ไม่ระบุ"
    }
- จังหวัด: ${lead.province || "ไม่ระบุ"}

- ประวัติการโทร (${
      (lead.calls || []).length
    } ครั้ง):
${JSON.stringify(
      (lead.calls || []).map((c: any) => ({
        answered: c.answered,
        interest: c.interestLevel,
        note: c.notes,
      }))
    )}

- บันทึกย่อเพิ่มเติม (${
      (lead.notes || []).length
    } ข้อความ):
${JSON.stringify(
      (lead.notes || []).map((n: any) => n.text)
    )}

ตอบเป็นภาษาไทย ในรูปแบบ JSON ตาม Schema นี้เท่านั้น:
- winProbability: ตัวเลข 0-100
- dealUrgency: "high" | "medium" | "low"
- summary: สรุปภาพรวมลูกค้ารายนี้ใน 2 ประโยค
- customerPersona: โปรไฟล์และลักษณะเฉพาะของลูกค้ารายนี้
- strengths: รายการจุดเด่นหรือปัจจัยบวกในการขาย 2-3 ข้อ
- challenges: รายการอุปสรรคหรือข้อกังวล 2-3 ข้อ
- recommendedAction: คำแนะนำขั้นตอนถัดไปสำหรับเซลส์
- salesPitchScript: บทพูดโทรขาย/ทักแชตสั้นๆ ที่ดึงดูดลูกค้า
- suggestedOffers: สิทธิประโยชน์/ข้อเสนอเรตราคาที่ควรนำเสนอ 2-3 ข้อ`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",

      contents: promptText,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            winProbability: {
              type: Type.NUMBER,
            },

            dealUrgency: {
              type: Type.STRING,
            },

            summary: {
              type: Type.STRING,
            },

            customerPersona: {
              type: Type.STRING,
            },

            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            challenges: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            recommendedAction: {
              type: Type.STRING,
            },

            salesPitchScript: {
              type: Type.STRING,
            },

            suggestedOffers: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },

          required: [
            "winProbability",
            "dealUrgency",
            "summary",
            "customerPersona",
            "strengths",
            "challenges",
            "recommendedAction",
            "salesPitchScript",
            "suggestedOffers",
          ],
        },
      },
    });

    const resultText = response.text || "";

    const parsed = JSON.parse(resultText);

    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error("AI Analysis error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI",
    });
  }
}
