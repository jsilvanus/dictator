package com.dictator.core.data.error

/**
 * Exception types for data layer error handling.
 */

sealed class DataException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    data class NotFound(val message: String) : DataException(message)
    data class ValidationError(val message: String) : DataException(message)
    data class NetworkError(val message: String, val cause: Throwable? = null) : DataException(message, cause)
    data class ServerError(val message: String, val code: Int? = null) : DataException(message)
    data class SyncError(val message: String) : DataException(message)
    data class ConflictError(val message: String) : DataException(message)
    data class DatabaseError(val message: String, val cause: Throwable? = null) : DataException(message, cause)
    data class AuthenticationError(val message: String) : DataException(message)
    data class AuthorizationError(val message: String) : DataException(message)
}

sealed class Result<T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error<T>(val exception: DataException) : Result<T>()
    
    inline fun fold(
        onSuccess: (T) -> Unit,
        onError: (DataException) -> Unit
    ) {
        when (this) {
            is Success -> onSuccess(data)
            is Error -> onError(exception)
        }
    }
    
    inline fun <R> map(transform: (T) -> R): Result<R> {
        return when (this) {
            is Success -> Success(transform(data))
            is Error -> Error(exception)
        }
    }
    
    inline fun <R> flatMap(transform: (T) -> Result<R>): Result<R> {
        return when (this) {
            is Success -> transform(data)
            is Error -> Error(exception)
        }
    }
    
    fun getOrNull(): T? = (this as? Success)?.data
    
    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Error -> throw exception
    }
}

/**
 * Retry strategy for transient failures.
 */
data class RetryStrategy(
    val maxRetries: Int = 3,
    val initialDelayMs: Long = 100,
    val maxDelayMs: Long = 10000,
    val backoffMultiplier: Double = 2.0
) {
    fun calculateDelayMs(attempt: Int): Long {
        val exponentialDelay = (initialDelayMs * Math.pow(backoffMultiplier, attempt.toDouble())).toLong()
        return minOf(exponentialDelay, maxDelayMs)
    }
}

/**
 * Determines if an error is retryable.
 */
fun DataException.isRetryable(): Boolean = when (this) {
    is DataException.NetworkError -> true
    is DataException.ServerError -> {
        // Retry on 5xx and specific 4xx errors
        code?.let { it in 500..599 || it == 429 } ?: true
    }
    else -> false
}
