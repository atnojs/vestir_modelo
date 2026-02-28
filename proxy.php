<?php
// 1. Establece la cabecera para indicar que la respuesta será JSON.
header('Content-Type: application/json');

// 2. Obtiene la API Key de la variable de entorno.
$apiKey = getenv('GEMINI_KEY_VESTIR_MODELO');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API Key no configurada en el servidor.']);
    exit();
}

// 3. Lee los datos enviados desde app.js.
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron datos.']);
    exit();
}

$prompt = $input['prompt'];
$modelImage = $input['modelImage'];
$outfitImage = $input['outfitImage'];
$model = $input['model'] ?? 'gemini-2.5-flash-image';

// 4. Construye el payload correcto.
// CORRECCIÓN: Imágenes primero (prenda, luego modelo), prompt al final.
// Esto coincide con el formato oficial de Gemini para generación de imágenes multimodales.
$payload = [
    'contents' => [[
        'parts' => [
            ['inlineData' => ['mimeType' => $outfitImage['mimeType'], 'data' => $outfitImage['base64']]],
            ['inlineData' => ['mimeType' => $modelImage['mimeType'], 'data' => $modelImage['base64']]],
            ['text' => $prompt]
        ]
    ]]
];

// 5. Realiza la llamada a la API de Gemini usando cURL.
$apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' . urlencode($model) . ':generateContent?key=' . $apiKey;

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// 6. Devuelve la respuesta (o un error) a app.js.
if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en cURL: ' . $curl_error]);
} elseif ($httpcode >= 400) {
    http_response_code($httpcode);
    echo $response;
} else {
    echo $response;
}
?>