export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-[#7b7bbd] to-[#2d184a] text-white py-12 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start px-4 gap-8">
        <div>
          <h3 className="text-2xl font-bold mb-2">CONTACT US</h3>
          <p className="flex items-center gap-2 font-semibold">
            <span>🎤</span> BornToSing
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <span>📞</span> 062-543-7772
          </p>
        </div>
        <div>
          <p className="font-bold mb-1">Location</p>
          <p>
            1518 Pracharat 1 Road, Wongsawang, Bang Sue,
            <br />
            Bangkok 10800, Thailand.
          </p>
          <p className="font-bold mt-4 mb-1">Open Monday - Sunday:</p>
          <p>10:00 a.m. - 22:00 p.m.</p>
        </div>
      </div>
    </footer>
  );
}
