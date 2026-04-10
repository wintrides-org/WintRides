import RequestForm from "@/components/RequestForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GroupRequestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const pickupAtDate = readFirst(params.date);
  const pickupAtTime = readFirst(params.timeStart);
  const pickupAtInput =
    pickupAtDate && pickupAtTime ? `${pickupAtDate}T${pickupAtTime}` : undefined;

  // Group flow: adds pickup time and lets organizers set cars needed.
  return (
    <RequestForm
      requestType="GROUP"
      title="Group request"
      description="Schedule rides for a group and choose how many cars you need."
      showPickupAt
      showCarsNeeded
      initialValues={{
        pickup: readFirst(params.pickup),
        dropoff: readFirst(params.dropoff),
        pickupAtInput,
        sourceCarpoolId: readFirst(params.sourceCarpoolId),
        partySize: Number(readFirst(params.partySize) || "1"),
        carsNeeded: Number(readFirst(params.carsNeeded) || "1"),
      }}
    />
  );
}
