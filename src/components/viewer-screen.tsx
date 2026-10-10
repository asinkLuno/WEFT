import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ViewerScreen({
  path,
  content,
}: {
  path: string;
  content: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">{path}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] rounded-md border">
          <pre className="p-4 font-mono text-xs">{content}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
