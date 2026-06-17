import {
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const body = await request.json()
    const client = getV2AdminClient()

    const { data: run } = await client
      .from('v2_checklist_runs')
      .select('*')
      .eq('id', params.id)
      .single()
    if (!run || run.user_id !== user.id) throw new V2ApiError('체크리스트를 찾을 수 없습니다.', 404)

    const items = body.items ?? run.items
    const allChecked =
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((i: any) => {
        if (i.requires_before_after) {
          return i.checked && i.before_photo_path && i.after_photo_path
        }
        return i.checked
      })

    const { data, error } = await client
      .from('v2_checklist_runs')
      .update({
        items,
        status: allChecked ? 'completed' : 'in_progress',
        completed_at: allChecked ? new Date().toISOString() : null,
      })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return v2Json({ run: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
