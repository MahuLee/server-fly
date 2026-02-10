import toast from 'react-hot-toast';

/**
 * 统一的 API 响应处理函数
 * @param response fetch 响应对象
 * @param options 配置选项
 * @returns 解析后的数据
 */
export async function handleApiResponse<T = any>(
  response: Response,
  options?: {
    successMessage?: string;
    showSuccessToast?: boolean;
  }
): Promise<T> {
  const result = await response.json();

  if (!result.success) {
    // API 返回 success: false，显示错误提示
    const errorMessage = result.error || result.message || '操作失败，请稍后重试';
    toast.error(errorMessage, {
      duration: 4000,
      position: 'top-center',
      style: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--color-error)',
        borderRadius: 'var(--border-radius-md)',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: 600,
      },
      icon: '❌',
    });
    throw new Error(errorMessage);
  }

  // 成功时显示提示（可选）
  if (options?.showSuccessToast && options.successMessage) {
    toast.success(options.successMessage, {
      duration: 3000,
      position: 'top-center',
      style: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--color-success)',
        borderRadius: 'var(--border-radius-md)',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: 600,
      },
      icon: '✅',
    });
  }

  return result.data;
}

/**
 * 处理网络错误
 * @param error 错误对象
 */
export function handleNetworkError(error: any): void {
  let errorMessage = '网络错误，请检查连接';

  if (error.message) {
    errorMessage = error.message;
  }

  toast.error(errorMessage, {
    duration: 4000,
    position: 'top-center',
    style: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--color-error)',
      borderRadius: 'var(--border-radius-md)',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: 600,
    },
    icon: '⚠️',
  });
}
