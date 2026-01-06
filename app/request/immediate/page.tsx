import RequestForm from "@/components/RequestForm";

export default function ImmediateRequestPage() {
  // Immediate flow: defaults pickup time and cars needed, so only core fields show.
  return (
    <RequestForm
      requestType="IMMEDIATE"
      title="Request now"
      description="Fill this out to place an immediate ride request."
    />
  );
}
