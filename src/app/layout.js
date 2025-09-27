import { AuthProvider } from "./Providers";
import { Kanit, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { ToastProvider } from "./components/toast/ToastProvider";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import PageFrame from "./components/PageFrame";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BornToSing",
  description: "A karaoke booking website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${kanit.className} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {try {var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark', t==='dark');} catch(e) {}})();`,
          }}
        />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Navbar />
              <PageFrame>{children}</PageFrame>
              <Footer />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
