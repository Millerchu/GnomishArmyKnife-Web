function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function readDerLength(bytes, offset) {
  const first = bytes[offset]
  if (first < 0x80) {
    return { length: first, bytesUsed: 1 }
  }

  const lenBytes = first & 0x7f
  let length = 0
  for (let i = 0; i < lenBytes; i += 1) {
    length = (length << 8) | bytes[offset + 1 + i]
  }
  return { length, bytesUsed: 1 + lenBytes }
}

function readDerElement(bytes, offset) {
  const tag = bytes[offset]
  const { length, bytesUsed } = readDerLength(bytes, offset + 1)
  const headerLength = 1 + bytesUsed
  const start = offset + headerLength
  const end = start + length
  return {
    tag,
    length,
    headerLength,
    start,
    end,
    totalLength: headerLength + length
  }
}

function trimLeadingZero(bytes) {
  let index = 0
  while (index < bytes.length - 1 && bytes[index] === 0) {
    index += 1
  }
  return bytes.slice(index)
}

function bytesToBigInt(bytes) {
  if (!bytes.length) {
    return 0n
  }
  const hex = Array.from(bytes)
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
  return BigInt(`0x${hex}`)
}

function bigIntToBytes(value, length) {
  let hex = value.toString(16)
  if (hex.length % 2) {
    hex = `0${hex}`
  }

  const bytes = new Uint8Array(length)
  const raw = hex ? hex.match(/.{2}/g).map((h) => parseInt(h, 16)) : []
  if (raw.length > length) {
    throw new Error('加密结果长度异常')
  }

  bytes.set(raw, length - raw.length)
  return bytes
}

function modPow(base, exponent, modulus) {
  if (modulus === 1n) {
    return 0n
  }

  let result = 1n
  let b = base % modulus
  let e = exponent

  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % modulus
    }
    e >>= 1n
    b = (b * b) % modulus
  }

  return result
}

function parseRsaPublicKey(publicKey) {
  const pem = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')

  const der = base64ToBytes(pem)
  const root = readDerElement(der, 0)
  if (root.tag !== 0x30) {
    throw new Error('无效公钥格式')
  }

  let cursor = root.start
  const algorithmIdentifier = readDerElement(der, cursor)
  cursor += algorithmIdentifier.totalLength

  const bitString = readDerElement(der, cursor)
  if (bitString.tag !== 0x03) {
    throw new Error('无效公钥格式')
  }

  const bitStringBytes = der.slice(bitString.start + 1, bitString.end)
  const rsaSequence = readDerElement(bitStringBytes, 0)
  if (rsaSequence.tag !== 0x30) {
    throw new Error('无效公钥格式')
  }

  let rsaCursor = rsaSequence.start
  const modulusElement = readDerElement(bitStringBytes, rsaCursor)
  rsaCursor += modulusElement.totalLength

  const exponentElement = readDerElement(bitStringBytes, rsaCursor)

  if (modulusElement.tag !== 0x02 || exponentElement.tag !== 0x02) {
    throw new Error('无效公钥格式')
  }

  const modulusBytes = trimLeadingZero(
    bitStringBytes.slice(modulusElement.start, modulusElement.end)
  )
  const exponentBytes = trimLeadingZero(
    bitStringBytes.slice(exponentElement.start, exponentElement.end)
  )

  return {
    n: bytesToBigInt(modulusBytes),
    e: bytesToBigInt(exponentBytes),
    k: modulusBytes.length
  }
}

function getRandomNonZeroBytes(length) {
  const output = new Uint8Array(length)
  const random = new Uint8Array(length)
  let index = 0

  while (index < length) {
    crypto.getRandomValues(random)
    for (let i = 0; i < random.length && index < length; i += 1) {
      if (random[i] !== 0) {
        output[index] = random[i]
        index += 1
      }
    }
  }

  return output
}

export function encryptPasswordByPublicKey(password, publicKey) {
  if (!password || !publicKey) {
    throw new Error('密码或公钥为空')
  }

  const { n, e, k } = parseRsaPublicKey(publicKey)
  const message = new TextEncoder().encode(password)

  if (message.length > k - 11) {
    throw new Error('密码长度超出 RSA 加密限制')
  }

  const psLength = k - message.length - 3
  const em = new Uint8Array(k)
  em[0] = 0x00
  em[1] = 0x02
  em.set(getRandomNonZeroBytes(psLength), 2)
  em[2 + psLength] = 0x00
  em.set(message, 3 + psLength)

  const m = bytesToBigInt(em)
  const c = modPow(m, e, n)
  const encrypted = bigIntToBytes(c, k)
  return bytesToBase64(encrypted)
}
