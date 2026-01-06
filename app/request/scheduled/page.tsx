import RequestForm from "@/components/RequestForm";

export default function ScheduledRequestPage() {
  // Scheduled flow: adds a required pickup time, cars default to 1.
  return (
    <RequestForm
      requestType="SCHEDULED"
      title="Request ahead"
      description="Schedule a ride for later."
      showPickupAt
    />
  );
}
