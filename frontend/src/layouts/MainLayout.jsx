import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ✅ نفس الـ Navbar المستخدم في الصفحة الرئيسية */}
      <Navbar />

      {/* ✅ محتوى الصفحة */}
      <main className="flex-1 w-full mx-auto px-6 py-8 lg:px-16">
        {children}
      </main>

      {/* ✅ الفوتر الرئيسي */}
      <Footer />
    </div>
  );
};

export default MainLayout;
