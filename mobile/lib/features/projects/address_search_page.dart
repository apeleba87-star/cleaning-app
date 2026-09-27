import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'address_parser.dart';

export 'address_parser.dart' show AddressResult;

/// Daum 우편번호 서비스(키 불필요)로 주소를 찾는다.
const _html = '''
<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body,#wrap{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body>
<div id="wrap"></div>
<script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<script>
new daum.Postcode({
  width: '100%',
  height: '100%',
  oncomplete: function (data) { AddressChannel.postMessage(JSON.stringify(data)); }
}).embed(document.getElementById('wrap'));
</script>
</body></html>
''';

class AddressSearchPage extends StatefulWidget {
  const AddressSearchPage({super.key});

  @override
  State<AddressSearchPage> createState() => _AddressSearchPageState();
}

class _AddressSearchPageState extends State<AddressSearchPage> {
  late final WebViewController _controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..addJavaScriptChannel('AddressChannel', onMessageReceived: _onMessage)
    ..loadHtmlString(_html, baseUrl: 'https://postcode.map.daum.net');

  bool _done = false;

  void _onMessage(JavaScriptMessage message) {
    if (_done) return;
    final result = parsePostcodeResult(jsonDecode(message.message) as Map<String, dynamic>);
    if (result == null) return;
    _done = true;
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('주소 검색')),
      body: WebViewWidget(controller: _controller),
    );
  }
}
