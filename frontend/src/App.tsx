import FloatingShape from "@/components/FloatingShape";

function App() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br
      from-gray-800 via-gray-900 to-black flex items-center justify-center relative overflow-hidden"
    >
      <FloatingShape
        color="bg-gray-500"
        size="w-64 h-64"
        top="-10%"
        left="70%"
        delay={0}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-64 h-64"
        top="-5%"
        left="10%"
        delay={0}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-48 h-48"
        top="70%"
        left="80%"
        delay={5}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-32 h-32"
        top="40%"
        left="-5%"
        delay={2}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-40 h-40"
        top="75%"
        left="30%"
        delay={4}
      />

    </div>
  );
}

export default App;
