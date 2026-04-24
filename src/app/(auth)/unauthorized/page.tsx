import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Unauthorized</CardTitle>
          <CardDescription>
            Your account has not been authorized to access CCISR Connect.
            Please contact your church administrator to request access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/login" />}>
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
