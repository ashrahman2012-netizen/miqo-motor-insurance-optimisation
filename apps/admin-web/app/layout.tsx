export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <div role="status" style={{padding: 12, borderBottom: "2px solid currentColor", fontWeight: 700}}>
          ADMIN — NON-PRODUCTION / SYNTHETIC DATA
        </div>
        {children}
      </body>
    </html>
  );
}
