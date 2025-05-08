import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface DatabaseData {
  [key: string]: any;
}

function DatabaseViewer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [data, setData] = useState<DatabaseData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { toast } = useToast();
  const itemsPerPage = 10;

  // Fetch table names when component mounts
  useEffect(() => {
    fetchTables();
  }, []);

  // Fetch the selected table's data when table selection changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, page);
    }
  }, [selectedTable, page]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database/tables');
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      const data = await response.json();
      setTables(data.tables);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch database tables',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string, page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/database/table/${tableName}?page=${page}&limit=${itemsPerPage}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${tableName}`);
      }
      const result = await response.json();
      setData(result.data);
      setTotalPages(Math.ceil(result.total / itemsPerPage));
      
      // Set columns based on first data item or provide default if empty
      if (result.data.length > 0) {
        setColumns(Object.keys(result.data[0]));
      } else {
        // Try to get columns from metadata if available
        setColumns(result.columns || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error(`Error fetching data from ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to fetch data from ${tableName}`,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleTableChange = (value: string) => {
    setSelectedTable(value);
    setPage(1); // Reset to first page when changing tables
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const renderTableData = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="text-center">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (!data || data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="text-center">
            No data available
          </TableCell>
        </TableRow>
      );
    }

    return data.map((row, rowIndex) => (
      <TableRow key={rowIndex}>
        {columns.map((column) => (
          <TableCell key={column}>
            {formatCellValue(row[column])}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.join(', ')}]`;
      }
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    return String(value);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Database Viewer</CardTitle>
          <CardDescription>
            Browse and view database tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Select value={selectedTable} onValueChange={handleTableChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => fetchTableData(selectedTable, page)}
              disabled={!selectedTable || loading}
            >
              Refresh
            </Button>
          </div>

          {selectedTable && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableCaption>
                    {selectedTable} (Page {page} of {totalPages})
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderTableData()}
                  </TableBody>
                </Table>
              </div>
              
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={handlePrevPage} className={page <= 1 ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          isActive={pageNum === page} 
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext onClick={handleNextPage} className={page >= totalPages ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DatabaseViewer;