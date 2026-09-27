import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import 'upload_job.dart';

class UploadStatusPage extends StatelessWidget {
  const UploadStatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    final queue = ServicesScope.of(context).queue;
    return Scaffold(
      appBar: AppBar(
        title: const Text('업로드 대기'),
        actions: [
          TextButton(onPressed: queue.retryNow, child: const Text('지금 다시 시도')),
        ],
      ),
      body: ListenableBuilder(
        listenable: queue,
        builder: (context, _) {
          final jobs = queue.jobs;
          if (jobs.isEmpty) return const Center(child: Text('모든 사진이 업로드되었습니다.'));
          return ListView.separated(
            itemCount: jobs.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final job = jobs[i];
              final status = switch (job.state) {
                JobState.uploading => '업로드 중',
                JobState.pending => job.attempts == 0 ? '대기 중' : '재시도 대기 (${job.lastError ?? ''})',
                JobState.failed => '실패: ${job.lastError ?? ''}',
              };
              return ListTile(
                leading: SizedBox(
                  width: 48,
                  height: 48,
                  child: Image.file(File(job.thumbFile), fit: BoxFit.cover, cacheWidth: 144),
                ),
                title: Text(job.role == 'after' ? '작업 후' : '작업 전'),
                subtitle: Text(status),
                trailing: job.state == JobState.failed
                    ? Row(mainAxisSize: MainAxisSize.min, children: [
                        IconButton(icon: const Icon(Icons.refresh), onPressed: () => queue.retry(job)),
                        IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => queue.discard(job)),
                      ])
                    : null,
              );
            },
          );
        },
      ),
    );
  }
}
