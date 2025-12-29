import { Page } from '@/components/ui/page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function UITest() {
  return (
    <Page title="GolPlay UI Test">
      <Card>
        <p style={{ marginBottom: 12 }}>
          Esto ya se ve como una plataforma seria.
        </p>
        <Button>Acción principal</Button>
      </Card>
    </Page>
  );
}
