import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-10 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <p className="text-sm text-secondary">© {new Date().getFullYear()} Ipê Mind Totem. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-secondary hover:text-primary text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-secondary hover:text-primary text-sm">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-secondary hover:text-primary text-sm">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
