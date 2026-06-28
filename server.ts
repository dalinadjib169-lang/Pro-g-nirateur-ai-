import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Gather all API keys from environment
const getApiKeys = () => {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  
  // Also look for GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('GEMINI_API_KEY_') && process.env[key]) {
      keys.push(process.env[key] as string);
    }
  });
  
  // Deduplicate
  return [...new Set(keys)];
};

let currentKeyIndex = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Endpoint to handle downloading files generated client-side
  // This bypasses WebView restrictions on blob: and data: URIs
  app.post("/api/download", (req, res) => {
    try {
      const { data, filename, contentType } = req.body;
      
      if (!data) return res.status(400).send("No data provided");
      
      // Extract base64 part if it's a data URI
      const base64Data = data.includes(';base64,') ? data.split(';base64,').pop() : data;
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Download endpoint error:", error);
      res.status(500).send("Error generating download");
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const apiKeys = getApiKeys();
      if (apiKeys.length === 0) {
        return res.status(500).json({ error: "No API keys configured" });
      }

      const { generationType, teacherInfo, subjectInfo, aiPrompt, documentLanguage, includeWatermark, contentStyle, designStyle, pageFrame } = req.body;

      if (!generationType) {
        return res.status(400).json({ error: "generationType is required" });
      }

      let systemInstruction = `أنت مساعد ذكي ومصمم محترف لمعلمي المدارس. 
      مهمتك إنشاء مذكرات، اختبارات، سلاسل تمارين، ملخصات، أو قصاصات بناءً على مدخلات المعلم بأعلى جودة بصرية.
      يجب أن يكون المخرج بتنسيق HTML فقط (بدون أي وسوم Markdown مثل \`\`\`html).
      استخدم inline CSS وتنسيقات متقدمة لجعله جذاباً جداً وجاهزاً للطباعة على ورقة A4.
      يجب أن تستخدم المتغير var(--doc-color, #1e40af) كـ primary color للون الرئيسي.
      
      تعليمات هامة جداً (يجب الالتزام بها حرفياً):
      1. لا تستخدم أكواد LaTeX للمعادلات الرياضية أبدأ (مثل رموز $ أو \\lim). استخدم دائماً نصوص عادية Unicode ورموز HTML كـ <sup> و <sub> و كسور CSS أو الجداول لعرض الرياضيات بشكل جميل.
      2. لا تقم بإنشاء إطار (border) حول الصفحة بالكامل، نظامنا سيقوم بإضافة الإطار المناسب بناءً على اختيار المستخدم. ركز فقط على تنسيق المحتوى الداخلي والعناوين.
      3. استخدم كلاس "avoid-break" (class="avoid-break") لأي بطاقة صغيرة (div)، تمرين قصير، أو أي جزء مترابط لا تريد أن ينقسم بين صفحتين عند الطباعة. لا تستخدم هذا الكلاس مع الأقسام الطويلة جداً لكي لا تترك مساحات بيضاء كبيرة.
      4. لا تضف أي هوامش جانبية ضخمة (margins/padding) للحاويات الرئيسية، اجعل العرض 100% لتستغل عرض الورقة.
      5. ممنوع قطعياً استخدام وسم <style>. جميع التنسيقات يجب أن تكون inline CSS (أي style="...").
      6. ممنوع استخدام خصائص position: fixed أو position: absolute إلا في العلامة المائية فقط لتجنب تخريب واجهة التطبيق.
      
      تعليمات التصميم والهيكلة:
      1. ستايل التصميم (Design Style): المستخدم اختار "${designStyle}". طبق هذا النمط من خلال الألوان المتدرجة، أشكال العناوين، الزوايا المنحنية، والخطوط للفقرات والبطاقات الداخلية. 
      2. ستايل المضمون (Content Style): المستخدم اختار "${contentStyle}".
         - "مختصر هادف": استخدم نقاطاً قصيرة، جداول صغيرة مركزة، وتخلص من الحشو.
         - "مفصل": تعمق في الشرح، أضف أمثلة، تفريعات كثيرة، وجداول موسعة.
         - "مضمون عادي": توازن معتاد.
      3. الترويسة (Header) أفقية بالكامل توزع معلومات الدولة، المؤسسة، الأستاذ، والمادة.
      4. **الجداول**: الجداول يجب أن تكون بعرض 100%. لون صف العناوين بـ var(--doc-color).
      5. **الأشكال والرسومات**: أضف أشكال (SVG) تناسب المادة (رياضيات: هندسة، علوم: نباتات/خلايا، إلخ).
      6. **العلامة المائية (Watermark)**: ${includeWatermark ? 'المستخدم طلب علامة مائية. أضف عنصر <div> كأول عنصر في body. أعطه الكلاس `watermark-bg` فقط بدون أي inline styles. وضع بداخله رسمة SVG تناسب المادة.' : 'المستخدم لم يطلب علامة مائية. لا تضف أي علامة مائية.'}
      7. اللغة: التزم بلغة الوثيقة ${documentLanguage} مع ضبط اتجاه النص (RTL للعربية، LTR للغات الأجنبية).`;
      
      let typeLabel = '';
      if (generationType === 'memo') typeLabel = 'مذكرة درس';
      else if (generationType === 'test') typeLabel = 'اختبار / فرض';
      else if (generationType === 'series') typeLabel = 'سلسلة تمارين';
      else if (generationType === 'summary') typeLabel = 'ملخص';
      else if (generationType === 'cutout_start') typeLabel = 'قصاصات لـ 8 وضعيات انطلاقية (قابلة للقص والطباعة للطلاب)';
      else if (generationType === 'cutout_learning') typeLabel = 'قصاصات لـ 8 وضعيات تعلمية (قابلة للقص والطباعة)';
      else if (generationType === 'cutout_integration') typeLabel = 'قصاصات لـ 8 وضعيات إدماجية / تقويمية (تتضمن قسمين بكل قصاصة)';

      let userPrompt = `
      الرجاء إنشاء: ${typeLabel}
      
      **اللغة المطلوبة للوثيقة**: ${documentLanguage === 'fr' ? 'الفرنسية (French)' : documentLanguage === 'en' ? 'الإنجليزية (English)' : 'العربية (Arabic)'}
      **ستايل التصميم**: ${designStyle}
      **ستايل المضمون**: ${contentStyle}

      **معلومات المعلم والمؤسسة:**
      - الأستاذ: ${teacherInfo?.firstName || ''} ${teacherInfo?.lastName || ''}
      - المؤسسة: ${teacherInfo?.school || ''}
      - الطور: ${teacherInfo?.phase || ''}
      - المستوى: ${teacherInfo?.level || ''}
      - المادة: ${teacherInfo?.subject || ''}
      
      **تفاصيل المحتوى:**
      ${generationType === 'test' ? `
      - نوع التقويم: ${subjectInfo?.examType || ''}
      - الفصل: ${subjectInfo?.term || ''}
      - التوقيت: ${subjectInfo?.duration || ''} (هام جداً: ضع رمز/أيقونة ساعة SVG تعبر عن التوقيت تتناسب مع ستايل التصميم المختار)
      ` : ''}
      ${subjectInfo ? JSON.stringify(subjectInfo, null, 2) : ''}
      
      **توجيهات إضافية وتحديد ستايل التصميم:**
      ${aiPrompt || 'قم بتصميم أنيق واحترافي.'}
      
      أخرج كود HTML مرتب، مع استخدام flexbox للترويسة والجداول. 
      اجعل التصميم يشبه النماذج الاحترافية جداً، مزخرف على الجوانب بإطارات ورسومات، ووفر المساحة (استغل كامل عرض الورقة). لا تترك هوامش فارغة ضخمة.
      هام جداً لتقليل عدد الأوراق عند الطباعة:
      - قلل الفراغات العمودية (margin, padding) بين العناصر والفقرات والجداول.
      - استغل المساحة الأفقية جيداً (يمكن استخدام شبكة grid أو flex لترتيب البطاقات جنباً إلى جنب).
      - تجنب إنشاء صفحات شبه فارغة. اجعل المحتوى متراصاً ومنسقاً بذكاء.
      - تجنب ترك أي هوامش سفلية (margin-bottom) مبالغ فيها، ولا تستخدم وسوم <br> فارغة.
      - إذا كان هناك الكثير من العناصر (مثل القصاصات أو التمارين القصيرة)، رتبها في عمودين أو ثلاثة لتقليل طول الصفحة.
      `;

      let response;
      let retries = 3;
      let attempts = 0;
      let lastError;

      while (attempts < retries) {
        try {
          // Pick current key and increment
          const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
          currentKeyIndex++;

          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          break; // Success
        } catch (error: any) {
          lastError = error;
          attempts++;
          console.error(`Attempt ${attempts} failed with key index ${(currentKeyIndex - 1) % apiKeys.length}:`, error.message);
          
          if (error.status === 429) {
            // Quota exceeded, retry immediately with next key
            continue;
          } else if (error.status === 503) {
            // Service unavailable, wait and retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } else if (attempts >= retries) {
            throw error;
          }
        }
      }

      if (!response) {
        throw lastError || new Error("Failed to generate content");
      }

      let htmlContent = response.text || "";
      // Clean up markdown code blocks if the model adds them despite instructions
      htmlContent = htmlContent.replace(/```html/gi, '').replace(/```/g, '');
      // Strip <style> tags to prevent breaking the main app UI
      htmlContent = htmlContent.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
      // Strip <script> tags to prevent execution
      htmlContent = htmlContent.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      // Prevent fixed position which breaks the React layout
      htmlContent = htmlContent.replace(/position\s*:\s*fixed/gi, 'position: absolute');
      // Also prevent viewport sizing that might cover everything
      htmlContent = htmlContent.replace(/100vw/gi, '100%').replace(/100vh/gi, '100%');

      res.json({ content: htmlContent });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during generation." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
