import RequestForm from "@/components/RequestForm";

export default function GroupRequestPage() {
  // Group flow: adds pickup time and lets organizers set cars needed.
  return (
    <RequestForm
      requestType="GROUP"
      title="Group request"
      description="Schedule rides for a group and choose how many cars you need."
      showPickupAt
      showCarsNeeded
    />
  );
}
