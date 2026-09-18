export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <div role="status" style={{padding: 12, borderBottom: "2px solid currentColor", fontWeight: 700}}>
          MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY
        </div>
        {children}
      </body>
    </html>
  );
}
