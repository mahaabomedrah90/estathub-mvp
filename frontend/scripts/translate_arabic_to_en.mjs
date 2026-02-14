import fs from "fs";
import path from "path";

const enPath = path.resolve("src/i18n/en/pages.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

const AR_RE = /[\u0600-\u06FF]/; // Arabic unicode range

// Translation map for Arabic to English
const translations = {
  // About section
  "قصتنا": "Our Story",
  "تأسست إستاتهَب برؤية واضحة: تمكين الاستثمار العقاري الديمقراطي في المملكة العربية السعودية من خلال تقنية البلوكشين المبتكرة.": "Estathub was founded with a clear vision: democratizing real estate investment in Saudi Arabia through innovative blockchain technology.",
  "يجمع فريقنا خبرة في العقارات والتمويل والتقنية لإنشاء منصة توفر الشفافية والأمان وإمكانية الوصول لجميع المستثمرين.": "Our team combines expertise in real estate, finance, and technology to create a platform that provides transparency, security, and accessibility for all investors.",
  
  "الرؤية والرسالة": "Vision & Mission",
  "رؤيتنا": "Our Vision",
  "أن نكون المنصة الرائدة للاستثمار العقاري في الشرق الأوسط، محولين كيفية استثمار الناس وملكية العقارات.": "To be the leading real estate investment platform in the Middle East, transforming how people invest in and own property.",
  "رسالتنا": "Our Mission",
  "تمكين الملكية الجزئية لأصول العقارات المميزة، وجعل الاستثمار العقاري متاحًا للجميع من خلال التوكنات الرقمية.": "To enable fractional ownership of premium real estate assets, making property investment accessible to everyone through digital tokens.",
  
  "قيمنا الأساسية": "Our Core Values",
  "الثقة": "Trust",
  "بناء علاقات دائمة من خلال الشفافية والموثوقية": "Building lasting relationships through transparency and reliability",
  "الشفافية": "Transparency",
  "تواصل مفتوح وعمليات واضحة لجميع المستثمرين": "Open communication and clear processes for all investors",
  "التمكين": "Empowerment",
  "تمكين الحرية المالية من خلال خيارات الاستثمار الذكية": "Enabling financial freedom through smart investment choices",
  "الجودة": "Quality",
  "انتقاء أفضل فرص الاستثمار العقاري لمستثمرينا": "Selecting the best real estate investment opportunities for our investors",
  
  "إنجازاتنا": "Our Achievements",
  "مستثمر نشط": "Active Investors",
  "عقارات مدرجة": "Listed Properties",
  "رضا العملاء": "Customer Satisfaction",
  
  // How it works section
  "للمستثمرين": "For Investors",
  "إنشاء حساب": "Create Account",
  "سجّل وأنهِ التحقق في دقائق": "Sign up and complete verification in minutes",
  "استكشاف الفرص": "Explore Opportunities",
  "تصفح فرص الاستثمار العقاري الموثوقة": "Browse vetted real estate investment opportunities",
  "استثمر": "Invest",
  "اشترِ التوكنات بدءًا من توكن واحد فقط": "Buy tokens starting from just one token",
  "تابع الأداء": "Track Performance",
  "راقب استثمارك وتلقَّ تحديثات منتظمة": "Monitor your investment and receive regular updates",
  
  "لملاك العقارات": "For Property Owners",
  "سجّل كمالك": "Register as Owner",
  "أنشئ حسابك وأنهِ تحقق مالك العقار": "Create your account and complete property owner verification",
  "قدّم عقارك": "Submit Your Property",
  "قدّم تفاصيل العقار والمستندات للمراجعة": "Provide property details and documents for review",
  "تواصل مع المستثمرين": "Connect with Investors",
  "تواصل مع مئات المستثمرين الموثقين على منصتنا": "Reach hundreds of verified investors on our platform",
  "إدارة الاستثمار": "Manage Investment",
  "تابع مبيعات التوكنات وتلقَّ دخل الإيجار الشهري": "Track token sales and receive monthly rental income",
  
  "الأمان والضمانات": "Security & Guarantees",
  "التحقق من الهوية": "Identity Verification",
  "جميع المستخدمين يخضعون لتحقق KYC/AML شامل": "All users undergo comprehensive KYC/AML verification",
  "تقييم العقار": "Property Evaluation",
  "تقييم احترافي ومراجعة قانونية لجميع العقارات": "Professional valuation and legal review for all properties",
  "أمان البلوكشين": "Blockchain Security",
  "جميع المعاملات مؤمّنة ببلوكشين Hyperledger Fabric": "All transactions secured with Hyperledger Fabric blockchain",
  "الامتثال التنظيمي": "Regulatory Compliance",
  "الامتثال الكامل مع أنظمة العقارات والتمويل السعودية": "Full compliance with Saudi real estate and finance regulations",
  
  // FAQ section
  "أسئلة شائعة حول إستاتهَب وتوكنز العقارات": "Common questions about Estathub and property tokens",
  "للمستثمرين": "For Investors",
  "كل ما تحتاج لمعرفته عن الاستثمار مع إستاتهَب": "Everything you need to know about investing with Estathub",
  "لملاك العقارات": "For Property Owners",
  "تعلم كيفية إدراج عقارك والوصول إلى المستثمرين": "Learn how to list your property and reach investors",
  
  "ما هو إستاتهَب؟": "What is Estathub?",
  "إستاتهَب هي منصة سعودية للتكنولوجيا العقارية تمكن الاستثمار الجزئي في العقارات من خلال توكنز البلوكشين.": "Estathub is a Saudi proptech platform that enables fractional investment in real estate through blockchain tokens.",
  "كيف أبدأ؟": "How do I get started?",
  "ببساطة أنشئ حسابًا، أكمل التحقق، تصفح العقارات المتاحة، وابدأ الاستثمار بقدر توكن واحد.": "Simply create an account, complete verification, browse available properties, and start investing with as little as one token.",
  "ما هو توكنز العقارات؟": "What are property tokens?",
  "توكنز العقارات هو عملية تحويل ملكية العقار إلى توكنات رقمية على البلوكشين، مما يتيح الملكية الجزئية.": "Property tokens are digital representations of property ownership on the blockchain, enabling fractional ownership.",
  "هل استثماري آمن؟": "Is my investment safe?",
  "نعم، جميع الاستثمارات مؤمّنة بعناوين العقارات القانونية ومحمية بتقنية البلوكشين.": "Yes, all investments are secured by legal property titles and protected by blockchain technology.",
  "كيف أستلم العوائد؟": "How do I receive returns?",
  "يتم توزيع العوائد شهريًا إلى محفظتك بناءً على نسبة ملكيتك للتوكنات.": "Returns are distributed monthly to your wallet based on your token ownership percentage.",
  "هل يمكنني بيع توكناتي؟": "Can I sell my tokens?",
  "نعم، يمكن تداول التوكنات في سوقنا الثانوي أو الاحتفاظ بها للنمو طويل الأجل.": "Yes, tokens can be traded on our secondary market or held for long-term growth.",
  
  "هل لديك أسئلة أخرى؟": "Still have questions?",
  "فريق الدعم لدينا هنا لمساعدتك في أي استفسارات": "Our support team is here to help with any inquiries",
  
  // Terms section
  "آخر تحديث: 8 فبراير 2026": "Last updated: February 8, 2026",
  "مهم جداً": "Very Important",
  "يرجى قراءة هذه الشروط بعناية. باستخدامك لمنصة إستاتهَب، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى التوقف عن استخدام المنصة فوراً.": "Please read these terms carefully. By using the Estathub platform, you agree to comply with these terms and conditions. If you do not agree to these terms, please stop using the platform immediately.",
  
  "1. قبول الشروط": "1. Acceptance of terms",
  "بالوصول إلى أو استخدام منصة إستاتهَب (\"المنصة\")، فإنك توافق على الالتزام بهذه الشروط والأحكام (\"الشروط\") وسياسة الخصوصية الخاصة بنا. إذا كنت لا توافق على هذه الشروط، يجب عليك التوقف عن استخدام المنصة فوراً.": "By accessing or using the Estathub platform (\"Platform\"), you agree to comply with these terms and conditions (\"Terms\") and our privacy policy. If you do not agree to these terms, you must stop using the platform immediately.",
  "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إعلامك بأي تغييرات عبر المنصة أو عبر البريد الإلكتروني المسجل لديك. استمرار استخدامك للمنصة بعد أي تعديلات يشكل موافقة على الشروط المعدلة.": "We reserve the right to modify these terms at any time. You will be notified of any changes through the platform or via your registered email. Continued use of the platform after any modifications constitutes acceptance of the modified terms.",
  
  "2. الأهلية والقبول": "2. Eligibility and Acceptance",
  "للتسجيل واستخدام المنصة، يجب أن:": "To register and use the platform, you must:",
  "تكون قد أكملت 18 عاماً على الأقل": "Be at least 18 years old",
  "تتمتع بالأهلية القانونية لإبرام العقود في المملكة العربية السعودية": "Have legal capacity to enter into contracts in Saudi Arabia",
  "تقدم معلومات دقيقة وحقيقية خلال عملية التسجيل": "Provide accurate and truthful information during registration",
  "تلتزم بتحديث معلوماتك الشخصية عند تغيرها": "Commit to updating your personal information when it changes",
  "تمتلك حساباً بنكياً سعودياً صالحاً": "Have a valid Saudi bank account",
  "نحتفظ بالحق في رفض أو إلغاء حسابات أي مستخدم لا يلتزم بهذه المتطلبات.": "We reserve the right to refuse or cancel accounts of any user who does not comply with these requirements.",
  
  "3. الاستثمار والمخاطر": "3. Investment and Risks",
  "إقرار بالمخاطر:": "Risk Acknowledgment:",
  "الاستثمار العقاري ينطوي على مخاطر مالية، بما في ذلك احتمالية فقدان رأس المال": "Real estate investment involves financial risks, including potential loss of capital",
  "القيم الاستثمارية يمكن أن تزيد أو تنقص بناءً على ظروف السوق": "Investment values can increase or decrease based on market conditions",
  "العوائد السابقة لا تضمن النتائج المستقبلية": "Past returns do not guarantee future results",
  "السيولة في الاستثمارات العقارية محدودة مقارنة بالأصول الأخرى": "Liquidity in real estate investments is limited compared to other assets",
  
  "مسؤوليات المستثمر:": "Investor Responsibilities:",
  "باستخدام المنصة، تتعهد بالالتزام بالآتي:": "By using the platform, you commit to the following:",
  "إجراء البحث والتحليل الشخصي قبل الاستثمار": "Conduct personal research and analysis before investing",
  "فهم كامل للمخاطر المرتبطة بكل استثمار": "Full understanding of risks associated with each investment",
  "استثمار المبالغ التي يمكنك تحمل خسارتها": "Invest amounts you can afford to lose",
  "الاستشارة مع مستشار مالي معتمد عند الحاجة": "Consult with a certified financial advisor when needed",
  
  "4. التزامات المستخدم": "4. User Obligations",
  "باستخدام المنصة، تتعهد بالالتزام بالآتي:": "By using the platform, you commit to the following:",
  "تقديم معلومات دقيقة وحقيقية في جميع الأوقات": "Provide accurate and truthful information at all times",
  "الحفاظ على سرية بيانات اعتماد حسابك": "Maintain confidentiality of your account credentials",
  "عدم استخدام المنصة لأغراض غير قانونية أو احتيالية": "Not use the platform for illegal or fraudulent purposes",
  "احترام حقوق الملكية الفكرية للمنصة والمستخدمين الآخرين": "Respect intellectual property rights of the platform and other users",
  "عدم التدخل في عمل المنصة أو التسبب في أضرار تقنية": "Not interfere with platform operation or cause technical damage",
  
  "5. الرسوم والتكاليف": "5. Fees and Costs",
  "ينطبق المنصة هيكل الرسوم التالي:": "The platform applies the following fee structure:",
  "رسوم التسجيل: مجانية": "Registration fees: Free",
  "رسوم الاستثمار: لا توجد رسوم على الاستثمار الأولي": "Investment fees: No fees on initial investment",
  "رسوم الأداء: 2% على الأرباح المحققة فقط": "Performance fees: 2% on realized profits only",
  "رسوم السحب: لا توجد رسوم على السحوبات القياسية": "Withdrawal fees: No fees on standard withdrawals",
  "رسوم إضافية: قد تنطبق على خدمات خاصة عند طلب المستخدم": "Additional fees: May apply to special services upon user request",
  "يتم الكشف عن جميع الرسوم بوضوح قبل إتمام أي معاملة. نحتفظ بالحق في تعديل هيكل الرسوم بإشعار مسبق 30 يوماً.": "All fees are clearly disclosed before completing any transaction. We reserve the right to modify the fee structure with 30 days prior notice.",
  
  "6. إنهاء الخدمة": "6. Service Termination",
  "يمكنك إنهاء استخدامك للمنصة في أي وقت عن طريق إغلاق حسابك. نحتفظ بالحق في:": "You can terminate your use of the platform at any time by closing your account. We reserve the right to:",
  "تعليق أو إغلاق حسابك لمخالفة هذه الشروط": "Suspend or close your account for violating these terms",
  "إنهاء الخدمة لأسباب أمنية أو تنظيمية": "Terminate service for security or regulatory reasons",
  "تقييد الوصول إلى حسابك بدون إشعار مسبق في حالات الطوارئ": "Restrict access to your account without prior notice in emergency situations",
  "عند إغلاق الحساب، سيتم معالجة الاستثمارات النشطة وفقاً للشروط المطبقة في وقت الاستثمار.": "Upon account closure, active investments will be processed according to the terms applicable at the time of investment.",
  
  "7. معلومات الاتصال": "7. Contact Information",
  "لأي استفسارات حول هذه الشروط، يرجى التواصل معنا:": "For any inquiries about these terms, please contact us:",
  
  // Privacy section
  "التزامنا بالخصوصية": "Our Privacy Commitment",
  "في إستاتهَب، نحن ملتزمون بحماية خصوصيتك وأمان بياناتك الشخصية. هذه السياسة توضح كيف نجمع ونستخدم ونحمي معلوماتك وفقاً للوائح حماية البيانات الشخصية في المملكة العربية السعودية.": "At Estathub, we are committed to protecting your privacy and the security of your personal data. This policy explains how we collect, use, and protect your information in accordance with personal data protection regulations in Saudi Arabia.",
  
  "1. البيانات التي نجمعها": "1. Data We Collect",
  "البيانات الشخصية:": "Personal Data:",
  "الاسم الكامل وتاريخ الميلاد": "Full name and date of birth",
  "رقم الهوية الوطنية أو الإقامة": "National ID or residence permit number",
  "معلومات الاتصال (البريد الإلكتروني، رقم الهاتف)": "Contact information (email, phone number)",
  "العنوان السكني": "Residential address",
  "معلومات الحساب البنكي": "Bank account information",
  "بيانات التحقق من الهوية (مثل صور الهوية)": "Identity verification data (such as ID photos)",
  
  "البيانات الاستثمارية:": "Investment Data:",
  "تفاصيل الاستثمارات والمعاملات": "Investment and transaction details",
  "الأهداف الاستثمارية والتحمل المخاطرة": "Investment objectives and risk tolerance",
  "سجل الأداء": "Performance records",
  "التواصل مع المستشارين الماليين": "Communication with financial advisors",
  
  "البيانات التقنية:": "Technical Data:",
  "عنوان IP ونوع الجهاز": "IP address and device type",
  "بيانات استخدام المنصة": "Platform usage data",
  "ملفات تعريف الارتباط (Cookies)": "Cookies",
  "سجل النشاطات الأمنية": "Security activity logs",
  
  "2. كيف نستخدم بياناتك": "2. How We Use Your Data",
  "نستخدم بياناتك للأغراض التالية:": "We use your data for the following purposes:",
  "تقديم خدمات الاستثمار العقاري وإدارة حسابك": "Providing real estate investment services and managing your account",
  "التحقق من الهوية والامتثال للمتطلبات التنظيمية": "Identity verification and regulatory compliance",
  "تحسين جودة الخدمات وتجربة المستخدم": "Improving service quality and user experience",
  "التواصل معك حول معاملاتك واستثماراتك": "Communicating with you about your transactions and investments",
  "توفير الدعم الفني وخدمة العملاء": "Providing technical support and customer service",
  "حماية أمان المنصة والوقاية من الاحتيال": "Protecting platform security and preventing fraud",
  "الامتثال بالقوانين واللوائح المعمول بها": "Compliance with applicable laws and regulations",
  
  "3. حماية البيانات": "3. Data Protection",
  "نتخذ إجراءات أمنية شاملة لحماية بياناتك:": "We take comprehensive security measures to protect your data:",
  "تشفير البيانات أثناء النقل والتخزين": "Data encryption during transmission and storage",
  "الوصول المقيد إلى البيانات الشخصية": "Restricted access to personal data",
  "جدران حماية وأنظمة كشف التسلل": "Firewalls and intrusion detection systems",
  "النسخ الاحتياطي المنتظم للبيانات": "Regular data backup",
  "التدقيق الأمني الدوري": "Periodic security audits",
  "تدريب الموظفين على حماية البيانات": "Employee training on data protection",
  "ملاحظة: نحن لا نبيع بياناتك لأطراف ثالثة أبداً، ولا نشاركها إلا بموافقتك أو كما هو مطلوب قانوناً.": "Note: We never sell your data to third parties, and we only share it with your consent or as legally required.",
  
  "4. حقوقك كمالك للبيانات": "4. Your Rights as Data Owner",
  "وفقاً للوائح حماية البيانات الشخصية، لديك الحقوق التالية:": "According to personal data protection regulations, you have the following rights:",
  "الحق في الوصول:": "Right to Access:",
  "معرفة البيانات التي نحتفظ بها عنك": "Know what data we hold about you",
  "الحق في التصحيح:": "Right to Correction:",
  "Request correction of inaccurate data": "Request correction of inaccurate data",
  "الحق في الحذف:": "Right to Deletion:",
  "طلب حذف بياناتك الشخصية": "Request deletion of your personal data",
  "الحق في تقييد المعالجة:": "Right to Restrict Processing:",
  "تقييد استخدام بياناتك": "Restrict the use of your data",
  "الحق في نقل البيانات:": "Right to Data Portability:",
  "الحصول على نسخة من بياناتك": "Obtain a copy of your data",
  "الحق في الاعتراض:": "Right to Object:",
  "الاعتراض على كيفية معالجة بياناتك": "Object to how your data is processed",
  "لممارسة هذه الحقوق، يرجى التواصل معنا على privacy@estathub.sa": "To exercise these rights, please contact us at privacy@estathub.sa",
  
  "5. ملفات تعريف الارتباط": "5. Cookies",
  "نستخدم ملفات تعريف الارتباط لتحسين تجربتك:": "We use cookies to improve your experience:",
  "ملفات تعريف الارتباط الأساسية: لتشغيل الموقع بشكل صحيح": "Essential cookies: for the website to function properly",
  "ملفات تعريف الارتباط التحليلية: لفهم كيفية استخدام الموقع": "Analytical cookies: to understand how the site is used",
  "ملفات تعريف الارتباط الوظيفية: لتذكر تفضيلاتك": "Functional cookies: to remember your preferences",
  "يمكنك إدارة ملفات تعريف الارتباط من خلال إعدادات المتصفح الخاص بك.": "You can manage cookies through your browser settings.",
  
  "6. معلومات الاتصال": "6. Contact Information",
  "لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا:": "For any inquiries about the privacy policy, please contact us:"
};

const SECTIONS = new Set(["about", "howItWorks", "faq", "terms", "privacy"]);

function walk(node, path = "") {
  if (typeof node === "string") {
    if (AR_RE.test(node)) {
      // Return the English translation if available, otherwise keep original
      return translations[node] || node;
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item, index) => walk(item, `${path}[${index}]`));
  }
  if (node && typeof node === "object") {
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      const newPath = path ? `${path}.${key}` : key;
      // Only process if we're in one of the target sections or at root level
      const sectionName = newPath.split('.')[0];
      if (path === "" || SECTIONS.has(sectionName)) {
        result[key] = walk(value, newPath);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return node;
}

const cleaned = walk(en);

fs.writeFileSync(enPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");
console.log("✅ Translated Arabic strings to English in target sections");
