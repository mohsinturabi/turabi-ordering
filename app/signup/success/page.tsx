export default function SignupSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-green-600">
          🎉 Restaurant created successfully!
        </h1>
        <p className="text-gray-600">
          Check your email for the invitation link and set your password.
        </p>
      </div>
    </div>
  );
}