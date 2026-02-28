<?php
// 1. Establece la cabecera para indicar que la respuesta será JSON.
header('Content-Type: application/json');

// 2. Obtiene la API Key de la variable de entorno configurada en .htaccess.
$apiKey = getenv('GEMINI_API_KEY');

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

// 4. Construye el payload correcto.
$system_instruction = "Your sole task is to generate an image based on the user's text prompt and input images. Do not respond with any text, chat, or conversational preamble. Only output the final generated image. User prompt: ";
$combined_prompt = $system_instruction . $prompt;

$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $combined_prompt],
            ['inlineData' => ['mimeType' => $modelImage['mimeType'], 'data' => $modelImage['base64']]],
            ['inlineData' => ['mimeType' => $outfitImage['mimeType'], 'data' => $outfitImage['base64']]]
        ]
    ]]
];

// 5. Realiza la llamada a la API de Gemini usando cURL.
// CAMBIO PRECISO: Modelo actualizado a gemini-1.5-flash-image-preview y API a v1beta.
$apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-image-preview:generateContent?key=' . $apiKey;

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