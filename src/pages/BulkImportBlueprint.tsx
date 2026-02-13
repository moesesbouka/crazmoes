import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminBulkImportBlueprint } from "@/components/admin/AdminBulkImportBlueprint";

const BulkImportBlueprint = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        <AdminBulkImportBlueprint />
      </div>
    </div>
  );
};

export default BulkImportBlueprint;
