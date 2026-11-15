export const matchRecipients = `INSERT INTO request_recipients(request_id,coach_id) SELECT $1,id FROM coaches WHERE approved=true AND member_id<>$4 AND $2=ANY(sports) AND $3=ANY(regions) RETURNING coach_id`;
export const notifyRecipients = `INSERT INTO notifications(member_id,request_id,kind) SELECT c.member_id,r.request_id,'new_request' FROM request_recipients r JOIN coaches c ON c.id=r.coach_id WHERE r.request_id=$1`;
export const submitFeedback = `WITH inserted AS (
      INSERT INTO feedback(request_id,coach_id,body)
      SELECT r.request_id,c.id,$3 FROM request_recipients r JOIN coaches c ON c.id=r.coach_id
      JOIN feedback_requests q ON q.id=r.request_id
      WHERE r.request_id=$1 AND c.member_id=$2 AND c.approved=true AND q.status='open'
      ON CONFLICT(request_id,coach_id) DO NOTHING RETURNING request_id
    ) INSERT INTO notifications(member_id,request_id,kind)
      SELECT q.member_id,q.id,'new_feedback' FROM inserted i JOIN feedback_requests q ON q.id=i.request_id RETURNING id`;
