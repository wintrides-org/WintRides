import RequestForm from "@/components/RequestForm";

export default function ImmediateRequestPage() {
  // Immediate flow: no pickup time or cars needed inputs.
  return (
    <RequestForm
      requestType="IMMEDIATE"
      title="Request now"
      description="Fill this out to place an immediate ride request."
    />
  );
}
