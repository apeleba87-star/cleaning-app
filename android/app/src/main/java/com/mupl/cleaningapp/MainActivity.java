package com.mupl.cleaningapp;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 100;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onStart() {
        super.onStart();
        
        // WebView에 WebChromeClient 설정하여 카메라 권한 처리
        try {
            Bridge bridge = this.getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        if (request == null) return;
                        
                        String[] requestedResources = request.getResources();
                        if (requestedResources == null || requestedResources.length == 0) {
                            request.deny();
                            return;
                        }
                        
                        // 카메라 권한 요청 처리
                        for (String resource : requestedResources) {
                            if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) || 
                                resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                                
                                // 권한이 이미 허용되어 있는지 확인
                                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) 
                                        == PackageManager.PERMISSION_GRANTED) {
                                    // 권한이 있으면 허용
                                    request.grant(requestedResources);
                                } else {
                                    // 권한이 없으면 요청
                                    pendingPermissionRequest = request;
                                    ActivityCompat.requestPermissions(
                                        MainActivity.this,
                                        new String[]{Manifest.permission.CAMERA},
                                        CAMERA_PERMISSION_REQUEST_CODE
                                    );
                                }
                                return;
                            }
                        }
                        
                        // 다른 권한은 기본 처리
                        request.deny();
                    }
                });
            }
        } catch (Exception e) {
            // 에러 발생 시 기본 동작 유지
            e.printStackTrace();
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // 권한이 허용되면 저장된 요청 승인
                if (pendingPermissionRequest != null) {
                    try {
                        pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    pendingPermissionRequest = null;
                }
            } else {
                // 권한이 거부되면 요청 거부
                if (pendingPermissionRequest != null) {
                    try {
                        pendingPermissionRequest.deny();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    pendingPermissionRequest = null;
                }
            }
        }
    }
}
