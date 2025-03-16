// admin-app/src/components/common/PendingRequestsBadge.jsx
import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';

const PendingRequestsBadge = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchPendingCount();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('pending_requests_count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_assignments',
        filter: 'status=eq.pending'
      }, () => {
        fetchPendingCount();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      
      // First check if table exists
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('vehicle_assignments')
          .select('id')
          .limit(1);
          
        if (tableError) {
          console.error('Table check error:', tableError);
          // Don't throw, just return without setting count
          setCount(0);
          return;
        }
      } catch (checkErr) {
        console.error('Error during table check:', checkErr);
        setCount(0);
        return;
      }
      
      // If table exists, proceed with count
      const { count, error } = await supabase
        .from('vehicle_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) {
        console.error('Count error:', error);
        throw error;
      }
      
      setCount(count || 0);
    } catch (err) {
      console.error('Error fetching pending requests count:', err);
      // Even on error, don't crash - just don't show a badge
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading || count === 0) {
    return null;
  }

  return (
    <Badge 
      bg="danger" 
      pill 
      className="ms-2"
      style={{ 
        fontSize: '0.65rem',
        position: 'relative',
        top: '-1px'
      }}
    >
      {count}
    </Badge>
  );
};

export default PendingRequestsBadge;