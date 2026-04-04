import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/components/ui/map/MapView'),
  { ssr: false }
);

export default function UITest() {
  const fields = [
    {
      id: 1,
      name: 'Cancha Test',
      price: 12000,
      lat: 9.933,
      lng: -84.083,
    },
  ];

  return (
    <div style={{ height: '100vh' }}>
      <MapView
        fields={fields}
        onSelect={(id) => alert(`Cancha ${id}`)}
      />
    </div>
  );
}
