import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Lend<span className="text-brand-600">Loop</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Join your neighborhood tool-lending community
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </div>
      </div>
    </div>
  );
}

