export function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-text-muted">
        <p>&copy; {new Date().getFullYear()} Shadow CRM. All rights reserved.</p>
        <p>Built by Ayush Kumar Jha</p>
      </div>
    </footer>
  );
}
